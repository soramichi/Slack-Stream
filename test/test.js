var Application = require('spectron').Application
var assert = require('assert')

var my_username = "soramichi"
var path_electron = "/home/soramichi/src/node-v6.9.4-linux-x64/bin/electron"
var path_slack_stream = "/home/soramichi/src/Slack-Stream"

describe('application launch', function () {
    this.timeout(10000)

    before(function () {
	this.app = new Application({
	    path: path_electron,
	    args: [path_slack_stream]
	})
	return this.app.start()
    })

    /*
    after(function () {
	if (this.app && this.app.isRunning()) {
	    return this.app.stop()
	}
    })
    */

    /*
    it('shows an initial window', function () {
	return this.app.client.getWindowCount().then(function (count) {
	    assert.equal(count, 1)
	})
    })

    it('main table exists', function () {
	return this.app.client.getHTML("#main_table").then(function (table) {
	    assert(table)
	})
    })
    */
    
    it('Send a message to myself', function () {
	client = this.app.client;

	this.app.client.execute(function () {
	    webs[0].chat.postMessage("@" + my_username, "hello", { "as_user": true} );
	});

	/*
	return this.app.client.waitUntil(function (){
	    client.getHTML("#main_table").then(function (table){
		return (table.innerHTML.indexOf("hello") =! -1);
	    })
	}).then(function (result){
	    assert.equal(false, true);
	});
        */
    })
})
