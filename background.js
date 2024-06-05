const apiUrl = 'https://api-prod.omnivore.app/api/graphql';
let apiKey = '';
const apiQueries = {
    search: `
        query Search($after: String, $first: Int, $query: String) {
            search(first: $first, after: $after, query: $query) {
                ... on SearchSuccess {
                    edges {
                        node {
                            id
                            url
                        }
                    }
                }
                ... on SearchError {
                    errorCodes
                }
            }
        }`,
    setLinkArchived: `
        mutation SetLinkArchived($input: ArchiveLinkInput!) {
            setLinkArchived(input: $input) {
                ... on ArchiveLinkSuccess {
                    linkId
                    message
                }
                ... on ArchiveLinkError {
                    message
                    errorCodes
                }
            }
        }`,
}
let nodes = [];
updateNodeList();

async function getApiKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('apiKey', function (data) {
            const apiKey = data.apiKey || '';
            resolve(apiKey);
        });
    });
}

async function updateNodeList() {
    // Make a request to the Omnivore API to get the top links
    apiKey = await getApiKey();
    const searchResponse = await fetch(apiUrl, {
        body: JSON.stringify({
            query: apiQueries.search,
            variables: {
                after: String(0),
                first: 10,
                query: 'in:inbox sort:saved-asc'
            }
        }),
        headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
        },
        method: 'POST',
    })
    if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
    }

    // Update the node list
    nodes = (await searchResponse.json()).data.search.edges.map(edge => edge.node);
}

chrome.commands.onCommand.addListener(async function (command) {
    if (command !== "pop-visit" && command !== "pop-nonvisit") {
        return;
    }

    // Update the node list if it is empty
    if (nodes.length === 0) {
        await updateNodeList();
    }

    // Get the top link
    const nodeToPop = nodes.shift();

    // Open the link in a new tab
    chrome.tabs.create({ url: nodeToPop.url, active: command === "pop-visit" });

    // Archive the link
    apiKey = await getApiKey();
    const archiveResponse = await fetch(apiUrl, {
        body: JSON.stringify({
            query: apiQueries.setLinkArchived,
            variables: {
                input: {
                    archived: true,
                    linkId: nodeToPop.id,
                },
            }
        }),
        headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
        },
        method: 'POST',
    })
    if (!archiveResponse.ok) {
        throw new Error(`HTTP error! status: ${archiveResponse.status}`);
    }

    // Update the node list
    updateNodeList();
});
