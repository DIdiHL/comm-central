/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource://app/modules/replyManagerUtils.js");
gMessageListeners.push({
  onStartHeaders: function () {},
  onEndHeaders: function () {},
  onEndAttachments: function () {},
  onBeforeShowHeaderPane: function () 
  {
    let beforeExpectReplyDateLabel = document.getElementById("BeforeExpectReplyDateLabel");
    let expectReplyDateLabel = document.getElementById("ExpectReplyDateLabel");
	expectReplyDateLabel.textContent = "";
    let expectReplyCheckbox = document.getElementById("hdrViewExpectReplyCheckbox");
    let modifyCommand = document.getElementById("cmd_hdrViewModifyExpectReply");
    let msgHdr = gFolderDisplay.selectedMessage;
    if (msgHdr.isExpectReply) {
      expectReplyCheckbox.setAttribute("checked", "true");
      modifyCommand.setAttribute("disabled", "false");
      beforeExpectReplyDateLabel.collapsed = false;
      expectReplyDateLabel.textContent += msgHdr.getStringProperty("ExpectReplyDate");
      expectReplyDateLabel.collapsed = false;
    } else {
      expectReplyCheckbox.setAttribute("checked", "false");
      modifyCommand.setAttribute("disabled", "true");
      beforeExpectReplyDateLabel.collapsed = true;
      expectReplyDateLabel.collapsed = true;
    }
  }
});

function toggleHdrViewExpectReplyCheckbox() {
  let checkbox = document.getElementById("hdrViewExpectReplyCheckbox");
  let menuitem = document.getElementById("hdrViewModifyExpectReplyItem");
  let msgHdr = gFolderDisplay.selectedMessage;
  if (checkbox.getAttribute("checked") == "true") {
    replyManagerUtils.resetExpectReplyForHdr(msgHdr);
    checkbox.setAttribute("checked", "false");
    menuitem.setAttribute("disabled", "true");
  } else if (checkbox.getAttribute("checked") == "false") {
    let params = {
      inn: msgHdr,
      out: null
    };
    window.openDialog("chrome://messenger/content/replyManagerDateDialog.xul", "",
                      "chrome, dialog, modal", params).focus();
    if (params.out) {
      replyManagerUtils.setExpectReplyForHdr(msgHdr, params.out);
      checkbox.setAttribute("checked", "true");
      menuitem.setAttribute("disabled", "false");
    }
  }
}

function hdrViewModifyExpectReply() {
  let msgHdr = gFolderDisplay.selectedMessage;
  let params = {
    inn: msgHdr,
    out: null
  }
  window.openDialog("chrome://messenger/content/replyManagerDateDialog.xul", "",
                    "chrome, dialog, modal", params).focus();
  if (params.out) {
    replyManagerUtils.updateExpectReplyForHdr(msgHdr, params.out);
  }
}
