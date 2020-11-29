const axios = require('axios')

const DataManager = require("./DataManager")

const OBSERVATION_INTERVAL_IN_SECONDS = 60;
const REFRESH_ENTRIES_INTERVAL_IN_SECONDS = 300; // every 5 minutes

const entriesManager = new DataManager('entries.json')

/**
 * @type {Map<string, number>}
 */
let entryIdToIntervalHandleMapping = new Map()
let entries = [];

async function refreshEntries() {
    const oldEntriesIds = (entries).map(entry => entry.id)

    entries = await entriesManager.read() || []

    if (!Array.isArray(entries)) {
        throw Error('Entries data is invalid')
    }

    for (let i = 0; i < entries.length; i++) {
        const index = oldEntriesIds.indexOf(entries[i].id)

        if (index === -1) {
            startObservation(entries[i])
        } else {
            oldEntriesIds[index] = null
        }
    }

    oldEntriesIds.forEach(id => {
        if (id) {
            clearInterval(entryIdToIntervalHandleMapping.get(id))
            entryIdToIntervalHandleMapping.delete(id)
            console.log(`Entry ${id} has been removed and no longer is being observed`)
        }
    })
}

function startObservation(entry) {
    entry.lastSuccessfulPing = null

    const handle = setInterval(() => {
        observeEntry(entry)
    }, OBSERVATION_INTERVAL_IN_SECONDS * 1000)

    observeEntry(entry)
    entryIdToIntervalHandleMapping.set(entry.id, handle)
    console.log(`Started observing ${entry.id}`)
}

async function observeEntry(entry) {
    const wasReachable = entry.hasOwnProperty('reachable') ? entry.reachable : null
    const downtime = calculateDowntime(entry)

    try {
        await axios.get(entry.url)
        entry.lastSuccessfulPing = new Date().getUTCSeconds()
        entry.reachable = true

        if (wasReachable === false) {
            console.log(`[${new Date().toISOString()}] ${entry.name} is reachable again`)
        }
    } catch (e) {
        entry.reachable = false

        if (wasReachable === true) {
            console.warn(`[${new Date().toISOString()}] ${entry.name} is unreachable`)
        }
    }

    if (downtime > 0) {
        console.log(`Downtime ${downtime} seconds`)
    }
}

function calculateDowntime(entry) {
    if (!entry.lastSuccessfulPing) {
        return null
    }

    if (entry.reachable) {
        return 0
    }

    return new Date().getUTCSeconds() - entry.lastSuccessfulPing
}

refreshEntries()
setInterval(() => {
    refreshEntries()
}, REFRESH_ENTRIES_INTERVAL_IN_SECONDS * 1000)
