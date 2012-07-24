/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource:///modules/replyManagerUtils.js");

function onLoad() {
  gMsgCompose.addMsgSendListener(replyManagerSendListener);//add reply manager send listener
}

function onUnload() {
  //remove reply manager send listener
  gMsgCompose.removeMsgSendListener(replyManagerSendListener);
}

//reply manager send listener
var replyManagerSendListener = {
  // nsIMsgSendListener
  onStartSending: function (aMsgID, aMsgSize) {},
  onProgress: function (aMsgID, aProgress, aProgressMax) {},
  onStatus: function (aMsgID, aMsg) {},
  onStopSending: function (aMsgID, aStatus, aMsg, aReturnFile) {
    //aMsgID starts with a < and ends with a >. Take the substring to strip the brackets.
    newMsgID = aMsgID.substring(1, aMsgID.length - 1);
    let aComposeStateListener = new replyManagerComposeStateListener(newMsgID);
    gMsgCompose.RegisterStateListener(aComposeStateListener);
  },
  onGetDraftFolderURI: function (aFolderURI) {},
  onSendNotPerformed: function (aMsgID, aStatus) {},
};


/* reply manager compose state listener
 * In order to communicate with the send listener, instead of using a single
 * listener object, each time the send listener gets notified, a new compse
 * state listener instance is created. And now no global is needed. */
function replyManagerComposeStateListener(aMsgID) {
  this.msgID = aMsgID;
}
replyManagerComposeStateListener.prototype = {
  /* This is the ID of the saved message */
  msgID: null,
  
  NotifyComposeFieldsReady: function() {},

  NotifyComposeBodyReady: function() {},

  ComposeProcessDone: function(aResult) {
    let folder = MailUtils.getFolderForURI(gMsgCompose.savedFolderURI);
    let msgDB = folder.msgDatabase;
    let savedMsgHdr = msgDB.getMsgHdrForMessageID(this.msgID);
    let toggle = document.getElementById("other-elements-toggle").checked;
    let dateStr = document.getElementById("reminder-date").value;
    if (savedMsgHdr != null && toggle)
    {
      replyManagerUtils.setExpectReplyForHdr(savedMsgHdr, dateStr);
    }
    gMsgCompose.UnregisterStateListener(this);
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
