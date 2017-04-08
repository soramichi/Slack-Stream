var Application = require('spectron').Application
var assert = require('assert')

var path_electron = "/home/soramichi/src/node-v6.9.4-linux-x64/bin/electron"
var path_slack_stream = "/home/soramichi/src/Slack-Stream"

describe('integration test', function () {
    this.timeout(10000)

    before(function () {
	this.app = new Application({
	    path: path_electron,
	    args: [path_slack_stream]
	})

	return this.app.start();
    })

    it('Send a message', function () {
	this.app.client.execute(function (){
	    // create a dummy client
	    _rtm = new DummyRtmClient("", {});
	    
	    // copy the event listener for RTM_EVENTS.MESSAGE
	    // Note: we assume rtms[0] is connected to the kongaribug channel
	    _rtm.on(RTM_EVENTS, rtms[0].listeners(RTM_EVENTS.MESSAGE)[0]);

	    // send a sample message
	    _rtm.send_message({
		type: 'message',
		channel: 'D3TPQMA5C',
		user: 'U3SCCNG2C',
		text: 'Message from dummy RtmClient',
		ts: '1491025427.019113',
		source_team: 'T2T2ETX4H',
		team: 'T2T2ETX4H'
	    })		   
	})

	return this.app.client.getHTML("#id_tr_1491025427019113_kongaribug_DM").then(function(tr){
	    var answer = '<tr id="id_tr_1491025427019113_kongaribug_DM" style=""><td><img src="https://secure.gravatar.com/avatar/540516246cc8ec8853f2fef630db6e62.jpg?s=32&amp;d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0007-32.png"></td><td><b>soramichi <a class="slack-link" href="slack://user?team=T2T2ETX4H&amp;id=U3SCCNG2C"><span style="color: #999d60">#DM</span></a></b> <span style="color: #aaaaaa; font-size: small;">14:43</span> <span id="button_1491025427019113_kongaribug_DM" class="glyphicon glyphicon-pencil message-button inactive_pencil"></span> <span style="float: right" id="del_1491025427019113_kongaribug_DM" class="glyphicon glyphicon-remove"></span><br><span id="text_1491025427019113_kongaribug_DM" class="message"> <p>Message from dummy RtmClient</p></span></td></tr>'
	    assert.equal(tr, answer)
	})
    })
})
