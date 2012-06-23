/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
 
gMessageListeners.push({
  onStartHeaders: function () {},
  onEndHeaders: function () {},
  onEndAttachments: function () {},
  onBeforeShowHeaderPane: function () 
  {
    let beforeExpectReplyDateLabel = document.getElementById("BeforeExpectReplyDateLabel");
    let expectReplyDateLabel = document.getElementById("ExpectReplyDateLabel");
	expectReplyDateLabel.textContent = "";
    let setItem = document.getElementById("hdrViewSetExpectReplyItem");
    let modifyItem = document.getElementById("hdrViewModifyExpectReplyItem");
    let removeItem = document.getElementById("hdrViewRemoveExpectReplyItem");
    let msgHdr = gFolderDisplay.selectedMessage;
    if (msgHdr.isExpectReply) {
      setItem.collapsed = true;
      modifyItem.collapsed = false;
      removeItem.collapsed = false;
      beforeExpectReplyDateLabel.collapsed = false;
      expectReplyDateLabel.textContent += msgHdr.getStringProperty("ExpectReplyDate");
      expectReplyDateLabel.collapsed = false;
    } else {
      setItem.collapsed = false;
      modifyItem.collapsed = true;
      removeItem.collapsed = true;
      beforeExpectReplyDateLabel.collapsed = true;
      expectReplyDateLabel.collapsed = true;
    }
  }
});
