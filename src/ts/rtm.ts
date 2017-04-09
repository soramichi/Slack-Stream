/// <reference path="../../node_modules/@types/jquery/index.d.ts" />
/// <reference path="./token.ts" />
/// <reference path="./util.ts" />
/// <reference path="./init.ts" />

let slack_sdk_path: string = '@slack/client';

let user_lists = new Array();
let channel_lists = new Array();
let bot_lists = new Array();
let emoji_lists = new Array();

let slack = require(slack_sdk_path);
let emojione = require("emojione");
let RtmClient = slack.RtmClient;
let RTM_EVENTS = slack.RTM_EVENTS;
let CLIENT_EVENTS = slack.CLIENT_EVENTS;
let WebClient = slack.WebClient;
let ipcRenderer = require( 'electron' ).ipcRenderer;
let marked = require("marked");
let webs = new Array();
let rtms = new Array();

let mark_read_flag = (localStorage["mark_read_flag"] == "true");
let show_pencils_flag = (localStorage["show_pencils_flag"] == "true");
let attention_flag = (localStorage["attention_flag"] == "true");

let show_team_name_flag = true;
if(localStorage["show_team_name_flag"] == "false") {
  show_team_name_flag = false;
}

let submit_channel_index = 0;
let show_one_channel = false;

let post_message;
let posting = false;

// for tests
class DummyRtmClient {
    private token: string;
    private args: {};
    private message_callback;

    constructor(token: string, args: {}){
	this.token = token;
	this.args = args;
    }

    public on(event, callback): void {
	this.message_callback = callback;
    }

    public send_message(message){
	this.message_callback(message);
    }
}


for(var i in tokens){
  rtms[i] = new RtmClient(tokens[i], {logLevel: 'debug'});
  rtms[i].start();
  webs[i] = new WebClient(tokens[i]);

  channel_lists[i] = {};
  init_channel_list(tokens[i], channel_lists[i]);

  user_lists[i] = {};
  init_user_list(tokens[i], user_lists[i]);
  emoji_lists[i] = {};
  init_emoji_list(tokens[i], emoji_lists[i]);

  // bot cannot be retrieved here
  bot_lists[i] = {};
}

for(var i in rtms){
  rtms[i].on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
    console.log(
    `Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet    connected to a channel`
    );
  });
}

function click_message_button(message_button) {
  if(message_button) {
    message_button.click();
    $('#slack_message_input').focus();
  }
}

$("#slack_message_input").keydown(function(e) {
  if(e.which == 38 && e.ctrlKey) {
    submit_channel_index = Math.max(submit_channel_index - 1, 0);
    click_message_button($('.message-button').get(submit_channel_index));
  }

  if(e.which == 40 && e.ctrlKey) {
    submit_channel_index++;
    let message_button = $('.message-button').get(submit_channel_index);
    if(message_button) {
      click_message_button($('.message-button').get(submit_channel_index));
    } else {
      submit_channel_index--;
    }
  }

  if(e.which == 13 && e.altKey){ // Alt + Enter
    let input = $("#slack_message_input");
    input.val(input.val() + "\n");
  } else if(e.which == 13 && !e.shiftKey && $('.textcomplete-dropdown').css("display") == "none") { // Enter
    e.preventDefault();
    submit_message();
  } 
});

$("#slack_message_input").keyup(function(e) {
  if(e.which == 27){ // Esc
    $('#slack_message_form').hide();
  }
});

function submit_message(): void {
  let message = $("#slack_message_input").val();
  if(posting || message == "") return;
  $("#slack_message_input").prop('disabled', true);

  posting = true;
  post_message (message, (err) => {
    posting = false;
    if(err) console.log(err);
    else {
      $("#slack_message_input").val("");
      $("#slack_message_form").hide();
    }
    $("#slack_message_input").prop('disabled', false);
  });
}

function delete_message(tr_id: string): number {
  let message_tr = $("#" + tr_id);

  message_tr.remove();
  return 0;
}

function create_attachment_message(attachments: {}): string {
  let ret_string = '';
  let main_dom = $('<div></div>').addClass('div-attachment pull-left');

  // author
  let author_dom = $('<span></span>').addClass('attachment-author');
  if(attachments['author_icon']) author_dom.html('<img src="' + attachments['author_icon'] + '" height="15px" />');
  if(attachments['author_link']) {
    let author_name_dom = $('<span></span>').addClass('attachment-author-name');
    if (attachments['author_link']) {
      author_name_dom = $('<a></a>').attr('href', attachments['author_link']).addClass('attachment-author-name');
    }
    author_name_dom.text(attachments['author_name']);
    author_dom.append(author_name_dom);

    if(attachments['author_subname']) {
      let author_subname_dom = $('<span></span>').addClass('attachment-author-subname');
      if (attachments['author_link']) {
        author_subname_dom = $('<a></a>').attr('href', attachments['author_link']).addClass('attachment-author-subname');
      }
      author_subname_dom.text(attachments['author_subname']);
      author_dom.append(author_subname_dom);
    }

    main_dom.append(author_dom);
  }

  // title
  if(attachments['title']) {
    let title_dom = $('<b></b>').addClass('attachment-title');
    if(attachments['title_link']) {
      title_dom = $('<a></a>').attr('href', attachments['title_link']).attr('style', 'font-weight: bold;').addClass('attachment-title');
    }
    title_dom.text(attachments['title']);
    main_dom.append(title_dom);
  }

  // text
  if(attachments['text']) {
    main_dom.append(message_escape(attachments['text'], {}, {}, ''));
  }

  // image
  if(attachments['image_url']) {
    let image_dom = $('<div style="width: 100%;"></div>').addClass('attachment-image');
    image_dom.html('<img src="' + attachments['image_url'] + '" width="100%" />');
    main_dom.append(image_dom);
    ret_string = main_dom.prop('outerHTML');
  } else if (attachments['thumb_url']) {
    let thumb_dom = $('<div style="width: 20%;"></div>').addClass('pull-right');
    let width = 'width="100%"', height = "";
    thumb_dom.html('<img src="' + attachments['thumb_url'] + '" ' + width + ' ' + height + '/>');
    main_dom.attr('style', 'width: 75%;');
    ret_string = main_dom.prop('outerHTML') + thumb_dom.prop('outerHTML');
  } else {
    main_dom.attr('style', 'width: 100%;');
    ret_string = main_dom.prop('outerHTML');
  }

  // footer
  if(attachments['footer']) {
    let footer_dom = $('<div></div>').addClass('attachment-footer');
    if(attachments['footer_icon']) {
      let footer_icon_dom = $('<span></span>');
      footer_icon_dom.html('<img src="' + attachments['footer_icon'] + '" height="15px" />');
      footer_dom.append(footer_icon_dom);
    }

    let footer_name_dom = $('<span></span>').text(attachments['footer']).addClass('attachment-footer-name');
    footer_dom.append(footer_name_dom);

    let footer_ts_dom = $('<a></a>').attr('href', attachments['from_url']).addClass('attachment-footer-ts');
    footer_ts_dom.text(new Date(attachments["ts"] * 1000).toLocaleString());
    footer_dom.append(footer_ts_dom);

    ret_string += footer_dom.prop('outerHTML');
  }

  return ret_string;
}

function update_message(message_id: string, message: {}, user_list: {}, emoji_list: {}, user_id: string, token: string): number {
  let pre_message: {} = message["previous_message"];
  let current_message: {} = message["message"];
  let message_form = $("#" + message_id);

  current_message["text"] += "<span style='font-size: small; color: #aaaaaa;'> (edited)</span>";
  let edited_message = message_escape(current_message["text"], user_list, emoji_list, user_id);
  if(current_message["attachments"]) {
    edited_message += create_attachment_message(current_message["attachments"][0]);
  }
  if(!!current_message["file"] && current_message["file"]["mimetype"].indexOf("image") != -1) { // file_shared
    edited_message += "<a href='" + current_message["file"]["url_private"] + "'><img id='" + current_message["file"]["id"] + "' src='' style='max-width: 100%;'/></a>";
  }

  message_form.html(edited_message);

  if(!!current_message["file"]){
    get_image(get_maximum_thumbnail(current_message["file"]), token, current_message["file"]["id"], current_message["file"]["mimetype"]);
  }

  return 0;
}

function mail_to_html(m: string): string {
  let message: string = m;
  message = message.replace(/<mailto:[^\|>]+\|([^\|>]+)>/g,  "<a href='mailto:$1'>$1</a>");
  return message;
}

function url_to_html(m: string): string {
  let message: string = m;
  message = message.replace(/<(http[^\|>]+)\|([^\|>]+)>/g,  "<a href='$1'>$2</a>");
  if(message == m)
    message = message.replace(/<(http[^>]+)>/g,  "<a href='$1'>$1</a>");
  return message;
}

function user_to_html(m: string, user_list: {}, user_id: string): string {
  let message: string = m;
  
  message = message.replace(/<@([^>]+)>/g, function (user) {
    let short_user: string = user.replace(/\|[^>]+/g, "");
    if(attention_flag && user_id == short_user.substr(2, short_user.length - 3)) {
      ipcRenderer.send('attention');
    }
    let name: string = "@" + user_list[short_user.substr(2, short_user.length - 3)].name;
    return name;
  });

  message = message.replace(/<!([^>]+)>/g, function(special) {
      let all: string = special.substr(2, special.length - 3);
      let bar: number = all.indexOf("|");
      let name: string = bar == -1 ? ("@" + all) : all.substr(bar + 1);
      return name;
  });

  return message;
}

function newline_to_html(m: string): string {
  let message: string = m.replace(/(\r\n|\n|\r)$/, "");
  message = message.replace(/\r\n|\n|\r/g, "<br>");
  return message;
}

function convert_emoji(m: string, emoji_list: {}): string {
  return m.replace(/:[a-zA-Z0-9_+\-]+:/g, function(emoji) {
      if (emoji != emojione.shortnameToImage(emoji)) {
        return emojione.shortnameToImage(emoji);
      } else if(!!emoji_list[emoji.substr(1, emoji.length-2)]) {
        let image_url = emoji_list[emoji.substr(1, emoji.length-2)];
        let html = '<img class="emojione" src="' + image_url + '" />';
        return html;
      } else {
        return emoji;
      }
  });
}

function message_escape(m: string, user_list: {}, emoji_list: {}, user_id: string): string {
  let message: string = m;
  message = url_to_html(message);
  message = mail_to_html(message);
  message = user_to_html(message, user_list, user_id);
  message = marked(message);
  message = newline_to_html(message);
  message = convert_emoji(message, emoji_list);

  return message;
}

function channel_mark (channel, timestamp, web) {
  web.channels.mark (channel, timestamp, function(err, info) {
    if(err) {
        console.log(err);
    }
  });
}

function extract_text(message: any, user_list: {}, emoji_list: {}, user_id: string): string {
  if(message["text"]) {
    let m = message_escape(message["text"], user_list, emoji_list, user_id);
    if(message["attachments"]) {
      m += create_attachment_message(message["attachments"][0]);
    }
    return m;
  } else if(message["attachments"]) {
    let attachments: [any] = message["attachments"];
    return attachments.map (attachment => {
      let text = attachment["text"] ? message_escape(attachment["text"], user_list, emoji_list, user_id) : "";
      let pretext = attachment["pretext"] ? message_escape(attachment["pretext"], user_list, emoji_list, user_id) : "";
      return text + pretext;
    }).reduce((a, b) => a + b);    
  } else {
     return "";
  }
}

for(var i in rtms){
  let rtm_id = i;
  let channel_list:{} = channel_lists[i];
  let bot_list:{} = bot_lists[i];
  let emoji_list:{} = emoji_lists[i];
  let token: string = tokens[i]; 
  let web = webs[i];
  let team_info = {};

  rtms[i].on(RTM_EVENTS.MESSAGE, function (message) {
    let user: string = "";
    let user_id = this["activeUserId"];

    let image: string = "";
    let nick: string = "NoName";
    let channel: {} = channel_list[message["channel"]];
    let channel_name: string = channel ? channel["name"] : "DM";
    if(!team_info["team"])
      get_team_info(token, team_info);
    let team_name: string = team_info["team"]["name"];

    let ts: string = message["ts"];
    let id_base = ts.replace(".", "") + "_" + team_name.replace(/ /g, "") + "_" + channel_name.replace(/ /g, "");
    let tr_id = "id_tr_" + id_base;
    let text_id = "text_" + id_base;
    let button_id = "button_" + id_base;
    let del_id = "del_" + id_base;

    if(message["subtype"] == "message_deleted") {
      let pre_id_base = message["previous_message"]["ts"].replace(".", "") + "_" + team_name.replace(/ /g, "") + "_" + channel_name.replace(/ /g, "");
      let pre_tr_id = "id_tr_" + pre_id_base;
      return delete_message(pre_tr_id);
    } else if(message["subtype"] == "message_changed") {
      let pre_id_base = message["previous_message"]["ts"].replace(".", "") + "_" + team_name.replace(/ /g, "") + "_" + channel_name.replace(/ /g, "");
      let pre_text_id = "text_" + pre_id_base;
      return update_message(pre_text_id, message, user_lists[rtm_id], emoji_list, user_id, token);
    } else if(message["subtype"] == "bot_message") {
      if(!message["bot_id"]) { // "Only visible to you" bot has no bot_id or user info
        image = ""
        nick = "slackbot"
      } else { // Normal bots
        if(!bot_list[message["bot_id"]])
          get_bot_info(message["bot_id"], token, bot_list);
        user = bot_list[message["bot_id"]];
        image = user["icons"]["image_36"];
        nick = message["username"] || bot_list[message['bot_id']]['name']
      }
    } else {
      user = user_lists[rtm_id][message["user"]];
      image = user["profile"]["image_32"];
      nick = user["name"];
    }
    let text: string = extract_text(message, user_lists[rtm_id], emoji_list, user_id);
    let table = $("#main_table");

    let shared_file_image_id;
    if(!!message["file"] && message["file"]["mimetype"].indexOf("image") != -1) { // file_shared
      shared_file_image_id = message["file"]["id"];
      text += "<a href='" + message["file"]["url_private"] + "'><img id='" + shared_file_image_id + "' src='' style='max-width: 100%;'/></a>";
    }

    let ts_date: Date = new Date(Number(ts)*1000);
    let ts_s: string = (require('dateformat'))(ts_date, "HH:MM");

    let color: string = channel ? channel["color"] : channel_color(nick);
    
    let link: string = "";
    if(channel_name == "DM"){
        link = "slack://user?team=" + team_info["team"]["id"] + "&id=" + message["user"];
    }else{
        link = "slack://channel?team=" + team_info["team"]["id"] + "&id=" + message["channel"];
    }


    let image_column: string = "<td><img src='" + image  + "' /></td>";
    let text_column: string = "<td><b>" + nick + " <a class='slack-link' href='" + link + "'><span style='color: " + color + "'>#" + channel_name + "</span></b></a> ";
    if(tokens.length > 1) {
      let team_name_class = 'class="span-team-name"';
      if(!show_team_name_flag) team_name_class = 'class="span-team-name inactive-team-name"';
      text_column += "<span " + team_name_class + ">(" + team_name + ")</span> ";
    }
    text_column += "<span style='color: #aaaaaa; font-size: small;'>" + ts_s + "</span>";
    let pencil_state = show_pencils_flag ? 'active_pencil' : 'inactive_pencil';
    text_column += " <span id='" + button_id + "' class='glyphicon glyphicon-pencil message-button " + pencil_state + "'></span>";
    text_column += " <span style='float: right' id='" + del_id + "' class='glyphicon glyphicon-remove' /><br>";
    text_column += "<span id='" + text_id + "' class='message'> "+ text + "</span></td>";

    let style: string = "";
    if(show_one_channel && (team_name != team_to_show || channel_name != ch_to_show))
      style = "display: none";
    let record: string = "<tr id='" + tr_id +
      "' style='" + style + "'>"+ image_column + text_column + "</tr>";
    table.prepend(record);

    if(!!shared_file_image_id) {
      get_image(get_maximum_thumbnail(message["file"]), token, shared_file_image_id, message["file"]["mimetype"]);
    }

    var button = $("#" + button_id);
    $("#" + button_id).click(function() {
      let display_channel = channel ? ("#" + channel_name) : ("DM to " + nick);

      if(show_team_name_flag)
        display_channel += (" (" + team_name + ")");

      $("#slack_message_form").show();

      $("#slack_message_channel").html(display_channel);
      $("#slack_message_channel").css("color", color);
      $("#slack_message_input").focus();

      post_message = function(text, on_finish){
        let target = channel ? message["channel"] : ("@" + nick);
        web.chat.postMessage (target, text, { "as_user": true, "link_names": 1 }, function(err, info){
          on_finish(err);
        });
      };
    });

    var del = $("#" + del_id);
    $("#" + del_id).click(function(){
      web.chat.delete(ts, message["channel"], { "as_user": true });
    });

    if (channel && mark_read_flag) {
      channel_mark(message["channel"], ts, web);
    }
  });
}
