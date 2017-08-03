import { ipcMain } from 'electron'

const files = require.context('.', false, /\.js$/)
const modules = {}

files.keys().forEach((key) => {
    if (key === './index.js') return
    const id = key.replace(/(\.\/|\.js)/g, '')
    const instance = files(key).default
    if (!instance.id) instance.id = id
    modules[id] = instance
})

console.log('Start services initialize')
for (const key in modules) {
    if (modules.hasOwnProperty(key)) {
        const service = modules[key];
        if (service.initialize) {
            console.log(`Initializes service ${key}`)
            service.initialize();
        }
    }
}
console.log('End services initialize')

ipcMain.on('query', (event, {
        id,
    service,
    action,
    payload,
    }) => {
    const serInst = modules[service];
    if (!serInst) {
        event.sender.send(id, {
            rejected: `No such service [${service}]`,
        })
        return;
    }
    if (!serInst.actions) {
        event.sender.send(id, {
            rejected: `Service [${service}] has no actions at all!`,
        })
        return;
    }
    const actionInst = serInst.actions[action];
    if (!actionInst) {
        event.sender.send(id, {
            rejected: `No such action [${action}] in service [${service}]`,
        });
        return;
    }
    console.log(`execute query ${service}/${action}`)
    const result = actionInst(payload);
    if (result instanceof Promise) {
        result.then((resolved) => {
            event.sender.send(id, {
                resolved,
            })
        }, (rejected) => {
            event.sender.send(id, {
                rejected,
            })
        })
    } else if (result instanceof Error) {
        event.sender.send(id, {
            rejected: result,
        });
    } else {
        event.sender.send(id, {
            resolved: result,
        });
    }
})

export default modules
