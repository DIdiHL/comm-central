/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource:///modules/replyManagerUtils.js");

var gMsgID;

function onLoad() {
  gMsgCompose.addMsgSendListener(replyManagerSendListener);//add reply manager send listener
  gMsgCompose.RegisterStateListener(replyManagerComposeStateListener);//register reply manager compose state listener
}

function onUnload() {
  //remove reply manager send listener
  gMsgCompose.removeMsgSendListener(replyManagerSendListener);
  //unregister reply manager send listener
  gMsgCompose.UnregisterStateListener(replyManagerComposeStateListener);
}

//reply manager send listener
var replyManagerSendListener = {
  // nsIMsgSendListener
  onStartSending: function (aMsgID, aMsgSize) {},
  onProgress: function (aMsgID, aProgress, aProgressMax) {},
  onStatus: function (aMsgID, aMsg) {},
  onStopSending: function (aMsgID, aStatus, aMsg, aReturnFile) {
    //aMsgID starts with a < and ends with a >. Take the substring to strip the brackets.
    gMsgID = aMsgID.substring(1, aMsgID.length - 1);
  },
  onGetDraftFolderURI: function (aFolderURI) {},
  onSendNotPerformed: function (aMsgID, aStatus) {},
};

//reply manager compose state listener
var replyManagerComposeStateListener = {
  NotifyComposeFieldsReady: function() {},

  NotifyComposeBodyReady: function() {},

  ComposeProcessDone: function(aResult) {
    let folder = MailUtils.getFolderForURI(gMsgCompose.savedFolderURI);
    let msgDB = folder.msgDatabase;
    let savedMsgHdr = msgDB.getMsgHdrForMessageID(gMsgID);
    let toggle = document.getElementById("other-elements-toggle").checked;
    let dateStr = document.getElementById("reminder-date").value;
    if (savedMsgHdr != null && toggle)
    {
      replyManagerUtils.setExpectReplyForHdr(savedMsgHdr, dateStr);
    }
  },

  SaveInFolderDone: function(folderURI) {}
};

function toggleOtherReplyManagerElements()
{
  let toggle = document.getElementById("other-elements-toggle");
  let datePicker = document.getElementById("reminder-date");
  datePicker.disabled = !toggle.checked;
}

window.addEventListener("load", onLoad);
window.addEventListener("unload", onUnload);
document.getElementById("msgcomposeWindow").addEventListener("compose-window-reopen", onLoad);
