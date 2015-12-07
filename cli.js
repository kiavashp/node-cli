// native
var readline = require('readline');

// external
var yargs = require('yargs');

function proxyMethod(toObject, fromObject, methodName) {
    toObject[methodName] = fromObject[methodName].bind(fromObject);
}
function proxyReadLineInstance(methodName) {
    Interface.prototype[methodName] = function () {
        var _this = this;
        return _this.readline[methodName].apply(_this.readline, arguments);
    };
}

function Interface(options) {

    var _this = this;
    var input;
    var output;

	if (!(_this instanceof Interface)) {
		return new Interface(options);
	}

    options = options || {};

    _this.internals = {
        commands: null,
        caseSensative: options.caseSensitive || false
    };

    if (options.prompt) {
        if (typeof options.prompt === 'function') {
            _this.internals.prompt = {toString:options.prompt};
        } else {
            _this.internals.prompt = options.prompt;
        }
    }

    options.input = options.input || process.stdin;
    options.completer = options.completer || function (line) {
        var commands = _this.internals.commands &&
            Object.getOwnPropertyNames(_this.internals.commands);
        var trim = line.trim();
        var hits;

        if (!trim || !commands) {
            return [commands, line];
        }

        hits = commands.filter(function (c) {
            return c.indexOf(line) === 0;
        });

        return [hits, line];
    };

    _this.readline = readline.createInterface(options);

    if (_this.internals.prompt) {
        _this.readline.setPrompt(_this.internals.prompt);
    }

}
Interface.prototype.commands = function commands(commands) {

    var _this = this;

    if (!_this.internals.commands) {
        _this.internals.commands = commands;
        _this.readline.on('line', function (line) {
            var args = line.trim().split(' ');
            var command = args.shift();
            var Cmds = _this.internals.commands;
            var commands = Object.getOwnPropertyNames(Cmds);
            var cancelPrompt;
            var yargArgs = yargs(args)
                .exitProcess(false);

            if (!_this.internals.caseSensative) {
                command = command.toLowerCase();
                commands = commands.map(function(c) {
                    return c.toLowerCase();
                });
            }

            if (commands.indexOf(command) !== -1 && typeof Cmds[command] === 'function') {
                cancelPrompt = Cmds[command](yargArgs);
            } else if (command){
                if (typeof _this.internals.onMissingCommand === 'function') {
                    _this.internals.onMissingCommand(command, yargArgs);
                } else {
                    console.log('command not found: '+ command);
                }
            } else {

            }

            if (!cancelPrompt) {
                _this.prompt(true);
            } else if (typeof cancelPrompt.then === 'function') {
                cancelPrompt.then(function () {
                    _this.prompt(true);
                });
                cancelPrompt.catch(function (err) {
                    console.log(err.stack || err.message || err);
                    _this.prompt(true);
                });
            }

        });
    }

};
Interface.prototype.onMissingCommand = function onMissingCommand(handler) {
    var _this = this;
    if (typeof handler === 'function') {
        _this.internals.onMissingCommand = handler;
    } else {
        throw Error('invalid handler function');
    }
};

proxyReadLineInstance('prompt');
proxyReadLineInstance('on');
proxyReadLineInstance('close');
proxyReadLineInstance('pause');
proxyReadLineInstance('resume');
proxyReadLineInstance('write');
proxyReadLineInstance('clearLine');

proxyMethod(Interface, readline, 'clearScreenDown');
proxyMethod(Interface, readline, 'createInterface');
proxyMethod(Interface, readline, 'cursorTo');
proxyMethod(Interface, readline, 'moveCursor');

Interface.Interface = Interface;
Interface.readline = readline;

module.exports = Interface;
