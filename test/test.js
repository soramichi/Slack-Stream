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

	return this.app.start().then(function (app){
	    app.client.execute(function (){
		// create a dummy client
		_rtm = new DummyRtmClient("", {});

		// set dummy user_list
		user_lists[0] = {
		    "U3SCCNG2C": {
			"color": "3c989f",
			"deleted": false,
			"has_2fa": false,
			"id": "U3SCCNG2C",
			"is_admin": true,
			"is_bot": false,
			"is_owner": true,
			"is_primary_owner": false,
			"is_restricted": false,
			"is_ultra_restricted": false,
			"name": "slack_master",
			"profile": {
			    "avatar_hash": "g540516246cc",
			    "email": "jane.doe@gmail.com",
			    "first_name": "Jane",
			    "image_24": "https://secure.gravatar.com/avatar/540516246cc8ec8853f2fef630db6e62.jpg?s=24&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0007-24.png",
			    "image_32": "https://secure.gravatar.com/avatar/540516246cc8ec8853f2fef630db6e62.jpg?s=32&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0007-32.png",
			    "image_48": "https://secure.gravatar.com/avatar/540516246cc8ec8853f2fef630db6e62.jpg?s=48&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0007-48.png",
			    "image_72": "https://secure.gravatar.com/avatar/540516246cc8ec8853f2fef630db6e62.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0007-72.png",
			    "image_192": "https://secure.gravatar.com/avatar/540516246cc8ec8853f2fef630db6e62.jpg?s=192&d=https%3A%2F%2Fa.slack-edge.com%2F7fa9%2Fimg%2Favatars%2Fava_0007-192.png",
			    "image_512" : "https://secure.gravatar.com/avatar/540516246cc8ec8853f2fef630db6e62.jpg?s=512&d=https%3A%2F%2Fa.slack-edge.com%2F7fa9%2Fimg%2Favatars%2Fava_0007-512.png",
			    "last_name": "Doe",
			    "real_name": "Jane Doe",
			    "real_name_normalized": "jane doe",
			    "status": null,
			    "team_id": "T2T2ETX4H",
			    "tz": "Asia/Tokyo",
			    "tz_label": "Japan Standard Time",
			    "tz_offset": 32400,
			    "updated": 1484748362
			}
		    }
		}

		// copy the event listener for RTM_EVENTS.MESSAGE
		// Note: we assume rtms[0] is connected to the kongaribug channel
		_rtm.on(RTM_EVENTS, rtms[0].listeners(RTM_EVENTS.MESSAGE)[0]);
	    })
	})
    })

    it('Send a message', function () {
	this.app.client.execute(function (){
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
	    // expected output:
	    // '<tr id="id_tr_1491025427019113_kongaribug_DM" style=""><td><img src="https://secure.gravatar.com/avatar/540516246cc8ec8853f2fef630db6e62.jpg?s=32&amp;d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0007-32.png"></td><td><b>soramichi <a class="slack-link" href="slack://user?team=T2T2ETX4H&amp;id=U3SCCNG2C"><span style="color: #999d60">#DM</span></a></b> <span style="color: #aaaaaa; font-size: small;">14:43</span> <span id="button_1491025427019113_kongaribug_DM" class="glyphicon glyphicon-pencil message-button inactive_pencil"></span> <span style="float: right" id="del_1491025427019113_kongaribug_DM" class="glyphicon glyphicon-remove"></span><br><span id="text_1491025427019113_kongaribug_DM" class="message"> <p>Message from dummy RtmClient</p></span></td></tr>'
	    var place_pencil_id = tr.indexOf("button_1491025427019113_kongaribug_DM")
	    var place_del_id = tr.indexOf("del_1491025427019113_kongaribug_DM")
	    var place_text_id = tr.indexOf("text_1491025427019113_kongaribug_DM")

	    assert(tr.indexOf("slack_master") != -1, "Username does not exist")
	    assert(place_pencil_id = -1, "Pencil does not exist")
	    assert(place_del_id != -1, "Delete button does not exit")
	    assert(place_text_id != -1, "Message text does not exist")
	    assert(place_pencil_id < place_del_id, "Delete button should be behind pencil")
	    assert(place_del_id < place_text_id, "Message text should be behind delete button")
	})
    })
})
