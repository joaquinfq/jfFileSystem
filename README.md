# @jf/fs [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

Class for manipulating file system in a synchronous way using `NodeJS`.

You can create/remove directories recursively and read/write files too.

I use it mainly as base for file generators.

## Usage

[![npm install @jf/fs](https://nodei.co/npm/@jf/fs.png?compact=true)](https://npmjs.org/package/@jf/fs/)

### Example

#### Generator class

```js
const jfFileSystem = require('@jf/fs');
const path         = require('path');
const tr           = require('./translations');

class Generator extends jfFileSystem {
    constructor(directory)
    {
        this.directory = directory;
        // Clean directory recursively before generating files.
        this.rmdir(directory);
    }
    
    generate(data)
    {
        // If outfile has several levels of depth, no problem.
        // `write` method will create all required directories.
        data.forEach(
            config => this.write(
                path.join(
                    this.directory,
                    config.outfile
                ),
                this.parse(config.data)
            )
        );
    }
    
    log(level, name, label, ...args)
    {
        // Translating logs.
        // tr is a map with translations.
        super.log(level, name, tr[label], ...args);
    }
    
    parse(data)
    {
        // In your class, process data and convert it to string.
        return JSON.stringify(data);
    }
}
```

#### Translating texts

All texts are in spanish but if you want to translate them you can 
overwrite `log` method in child class (as in the previous example)
or to listen `log` event.

```js
const chalk        = require('chalk');
const siNumber     = require('si-number');
const fs           = require('@jf/fs').i();
fs.on(
    'log',
    data =>
    {
        // Show only errors
        if (data.level === 'error')
        {
            const _args = data.args;
            if (Array.isArray(_args))
            {
                _args.forEach(
                    (arg, index) =>
                    {
                        if (typeof arg === 'number')
                        {
                            // Format number in green using SI prefixes.
                            _args[index] = chalk.green(
                                siNumber(
                                    arg,
                                    {
                                        decimal   : ',',
                                        precision : 1,
                                        thousands : true
                                    }
                                )
                            );
                        }
                        else
                        {
                            // Texts in cyan.
                            _args[index] = chalk.cyan(arg);
                        }
                    }
                )
            }
        }
        else
        {
            delete data.label;
        }
    }
);
fs.log('info', '', 'Test %s', 'pl1'); // Omitted because is not an error.
fs.log('error', '', 'File %s already exists', '/tmp/exists.js'); // Filename in cyan
fs.log('error', '', 'Filesize %s', 1324); // Number formatted in green as 1,3k
```
