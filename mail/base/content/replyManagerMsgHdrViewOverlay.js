/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource:///modules/replyManagerUtils.js");
gMessageListeners.push({
  onStartHeaders: function () {},
  onEndHeaders: function () {},
  onEndAttachments: function () {},
  onBeforeShowHeaderPane: function () 
  {
    let msgHdr = gFolderDisplay.selectedMessage;
    hdrViewDeployItems(msgHdr);
  }
});

/* This function is called when the user clicks the "Expect Reply" checkbox
 * in otherActionsPopup. It will toggle the ExpectReply state of the selected
 * message header.*/
function toggleHdrViewExpectReplyCheckbox() {
  let checkbox = document.getElementById("hdrViewExpectReplyCheckbox");
  let msgHdr = gFolderDisplay.selectedMessage;
  //hdrViewDeployItems updates the header view pane to reflect the change
  if (checkbox.getAttribute("checked") == "true") {
    replyManagerUtils.resetExpectReplyForHdr(msgHdr);
    hdrViewDeployItems(msgHdr);
  } else if (checkbox.getAttribute("checked") == "false") {
    let params = {
      inMsgHdr: msgHdr,
      outDate: null
    };
    window.openDialog("chrome://messenger/content/replyManagerDateDialog.xul", "",
                      "chrome, dialog, modal", params);
    if (params.outDate) {
      replyManagerUtils.setExpectReplyForHdr(msgHdr, params.outDate);
      hdrViewDeployItems(msgHdr);
    }
  }
}

/* This function is called when the user clicks the "Change Deadline" menuitem in
 * otherActionsPopup. It changes the "ExpectReplyDate" property of the selected
 * message header.*/
function hdrViewModifyExpectReply() {
  let msgHdr = gFolderDisplay.selectedMessage;
  let params = {
    inMsgHdr: msgHdr,
    outDate: null
  };
  window.openDialog("chrome://messenger/content/replyManagerDateDialog.xul", "",
                    "chrome, dialog, modal", params);
  if (params.outDate) {
    replyManagerUtils.updateExpectReplyForHdr(msgHdr, params.outDate);
    //update the header view pane
    document.getElementById("ExpectReplyDateLabel").textContent = params.outDate;
  }
}

/**
 * This function controls the display of various elements in the header view
 * and the state of some menuitems in the otherActionsPopup
 * @param aMsgHdr is the currently selected message header.
 */
function hdrViewDeployItems(aMsgHdr) {
  let beforeExpectReplyDateLabel = document.getElementById("BeforeExpectReplyDateLabel");
  let expectReplyDateLabel = document.getElementById("ExpectReplyDateLabel");
  expectReplyDateLabel.textContent = "";
  let expectReplyCheckbox = document.getElementById("hdrViewExpectReplyCheckbox");
  let modifyCommand = document.getElementById("cmd_hdrViewModifyExpectReply");
  if (aMsgHdr.isExpectReply) {
    expectReplyCheckbox.setAttribute("checked", "true");
    modifyCommand.setAttribute("disabled", "false");
    beforeExpectReplyDateLabel.collapsed = false;
    expectReplyDateLabel.textContent += aMsgHdr.getStringProperty("ExpectReplyDate");
    expectReplyDateLabel.collapsed = false;
  } else {
    expectReplyCheckbox.setAttribute("checked", "false");
    modifyCommand.setAttribute("disabled", "true");
    beforeExpectReplyDateLabel.collapsed = true;
    expectReplyDateLabel.collapsed = true;
  }
}
