/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource:///modules/replyManagerUtils.js");

var replyManagerHdrViewListener = {
  displayedMessage: null,
  onStartHeaders: function () {},
  onEndHeaders: function () {},
  onEndAttachments: function () {},
  onBeforeShowHeaderPane: function () 
  {
    let msgHdr = gFolderDisplay.selectedMessage;
    /* We need to memorize the displayed message so as to update
     * the hdr view pane with correct data. */
    replyManagerHdrViewListener.displayedMessage = msgHdr;
    hdrViewDeployItems();
  }
};
gMessageListeners.push(replyManagerHdrViewListener);

/* This function is called when the user clicks the "Expect Reply" checkbox
 * in otherActionsPopup. It will toggle the ExpectReply state of the selected
 * message header.*/
function toggleHdrViewExpectReplyCheckbox() {
  let checkbox = document.getElementById("hdrViewExpectReplyCheckbox");
  let msgHdr = gFolderDisplay.selectedMessage;
  //hdrViewDeployItems updates the header view pane to reflect the change
  if (checkbox.getAttribute("checked") == "true") {
    replyManagerUtils.resetExpectReplyForHdr(msgHdr);
    hdrViewDeployItems();
  } else if (checkbox.getAttribute("checked") == "false") {
    let params = {
      inMsgHdr: msgHdr,
      outDate: null
    };
    window.openDialog("chrome://messenger/content/replyManagerDateDialog.xul", "",
                      "chrome, dialog, modal", params);
    if (params.outDate) {
      replyManagerUtils.setExpectReplyForHdr(msgHdr, params.outDate);
      hdrViewDeployItems();
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
    hdrViewDeployItems();
  }
}

/**
 * This function controls the display of various elements in the header view
 * and the state of some menuitems in the otherActionsPopup
 * @param aMsgHdr is the currently selected message header.
 */
function hdrViewDeployItems() {
  let aMsgHdr = replyManagerHdrViewListener.displayedMessage;
  let hdrViewIcon = document.getElementById("replyManagerHdrViewIcon");
  let beforeExpectReplyDateLabel = document.getElementById("BeforeExpectReplyDateLabel");
  let expectReplyDateLabel = document.getElementById("ExpectReplyDateLabel");
  expectReplyDateLabel.textContent = "";
  let expectReplyCheckbox = document.getElementById("hdrViewExpectReplyCheckbox");
  let modifyCommand = document.getElementById("cmd_hdrViewModifyExpectReply");
  let tooltipTextBundle = document.getElementById("replyManagerTooltipTexts");
  
  if (aMsgHdr.isExpectReply) {
    expectReplyCheckbox.setAttribute("checked", "true");
    modifyCommand.setAttribute("disabled", "false");
    beforeExpectReplyDateLabel.collapsed = false;
    expectReplyDateLabel.textContent += aMsgHdr.getStringProperty("ExpectReplyDate");
    expectReplyDateLabel.collapsed = false;
    hdrViewIcon.collapsed = false;
    
    /* Choose the image and appropriate tooltip text
     * of the hdrViewIcon according to the deadline and whether 
     * all recipients have replied to the selected message. */
    if (isPastDeadline(aMsgHdr.getStringProperty("ExpectReplyDate"))) {
      //At this moment I pick this image to show that we have passed the deadline
      hdrViewIcon.setAttribute("class", "pastDeadline");
      hdrViewIcon.tooltipText = tooltipTextBundle.getString("replyManagerIconTooltipBeginPastDeadline")
                              + " " + tooltipTextBundle.getString("replyManagerIconTooltipEnd");
    } else {
      let chooseImage = function(subject, aCollection, recipients, didReply) {
        if (didReply.every(function(flag) {return flag;})) {
          //all people have replied, show a tick
          hdrViewIcon.setAttribute("class", "allReplied");
          hdrViewIcon.tooltipText = tooltipTextBundle.getString("replyManagerIconTooltipBeginAllReplied");
        } else {
          //some people have not replied show an alert icon
          hdrViewIcon.setAttribute("class", "notAllReplied");
          hdrViewIcon.tooltipText = tooltipTextBundle.getString("replyManagerIconTooltipBeginNotAllReplied");
        }
        hdrViewIcon.tooltipText += " " + tooltipTextBundle.getString("replyManagerIconTooltipEnd");
      };
      replyManagerUtils.getNotRepliedForHdr(aMsgHdr, chooseImage);
    }
  } else {
    expectReplyCheckbox.setAttribute("checked", "false");
    modifyCommand.setAttribute("disabled", "true");
    beforeExpectReplyDateLabel.collapsed = true;
    expectReplyDateLabel.collapsed = true;
    hdrViewIcon.collapsed = true;
  }
}

/* isPastDeadline returns true if today's date is past the deadline indicated
 * by the ExpectReplyDate property of the message header.
 * @param aDateStr is the deadline */ 
function isPastDeadline(aDateStr) {
  let date = new Date();//this will get today's date
  /* The first 10 characters in the ISO string is in the format of
   * YYYY-MM-DD which is the same as aDateStr. */
  let today = date.toISOString().substr(0, 10);
  //Comparison in lexicographical order will return desirable result.
  return today > aDateStr;
}
