/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource:///modules/replyManagerUtils.js");
Components.utils.import("resource:///modules/StringBundle.js");

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
    replyManagerHdrViewWidget.hdrViewDeployItems();
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
    replyManagerHdrViewWidget.hdrViewDeployItems();
  } else if (checkbox.getAttribute("checked") == "false") {
    let params = {
      inMsgHdr: msgHdr,
      outDate: null
    };
    window.openDialog("chrome://messenger/content/replyManagerDateDialog.xul", "replyManagerDatePicker",
                      "chrome, dialog, modal", params);
    if (params.outDate) {
      replyManagerUtils.setExpectReplyForHdr(msgHdr, params.outDate);
      replyManagerHdrViewWidget.hdrViewDeployItems();
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
  window.openDialog("chrome://messenger/content/replyManagerDateDialog.xul", "replyManagerDateDialog",
                    "chrome, dialog, modal", params);
  if (params.outDate) {
    replyManagerUtils.updateExpectReplyForHdr(msgHdr, params.outDate);
    //update the header view pane
    replyManagerHdrViewWidget.hdrViewDeployItems();
  }
}

/* open the dialog showing the list of mail addresses that have not responded to
 * the displayed message. */
function showNotReplied() {
  let openDialogFunction = function(aGlodaMsg, aCollection, recipients, didReply) {
    let addressList = [];
    for each(let [i, recipient] in Iterator(recipients)) {
      if (!didReply[i])
        addressList.push(recipient);
    }
    let params = {
      inAddressList: addressList,
      outSendReminder: null,
    };
    window.openDialog("chrome://messenger/content/replyManagerShowAddressDialog.xul","replyManagerDateDialog",
                    "chrome, dialog, modal", params);
    //If the user clicked the accept button, open the compose window to send a reminder.
    if (params.outSendReminder) {
      replyManagerUtils.startReminderComposeForHdr(aGlodaMsg.folderMessage);
    }
  };
  replyManagerUtils.getNotRepliedForHdr(replyManagerHdrViewListener.displayedMessage, openDialogFunction);
}

/* isPastDeadline returns true if today's date is past the deadline indicated
 * by the ExpectReplyDate property of the message header.
 * @param aDateStr is the deadline */ 
function isPastDeadline(aDateStr) {
  let deadline = new Date(aDateStr);
  //we need to set the time all to 0 in order to only compare the dates
  let today = new Date().setHours(0,0,0,0);
  return deadline < today;
}

var replyManagerHdrViewWidget = {
  replyManagerStrings: null,
  
  /* The following are some xul elements which will be hidden or shown according to
   * the isExpectReply property of the selected message. */
  
  //otherActionsPopup
  expectReplyCheckbox: null,
  
  modifyCommand: null,
  
  //allRepliedBox
  allRepliedBox: null,
  
  //notAllRepliedBox
  notAllRepliedBox: null,
  
  expectReplyDateLabel: null,
  
  hdrViewIcon: null,
  
  notAllRepliedLabel: null,
  pastDeadlineLabel: null,
  
  notAllRepliedShowRepliesButton: null,
  
  showNotRepliedButton: null,

  notAllRepliedShowNotRepliedLabel: null,
  pastDeadlineShowNotRepliedLabel: null,
  
  /* Many elements are updated through an asynchronous Gloda query. While testing
   * we need to wait for the query to complete before proceeding. This method adds
   * a js property to the allRepliedBox (the choice is arbitrary) to indicate 
   * whether a query is going on.*/
  updatingHdrView: function(bUpdating) {
    let box = document.getElementById("allRepliedBox");
    box.updatingHdrView = bUpdating;
  },
  
  init: function() {
    this.replyManagerStrings = new StringBundle("chrome://messenger/locale/replyManager.properties");
  
    //otherActionsPopup
    this.expectReplyCheckbox = document.getElementById("hdrViewExpectReplyCheckbox");
  
    this.modifyCommand = document.getElementById("cmd_hdrViewModifyExpectReply");
  
    //allRepliedBox
    this.allRepliedBox = document.getElementById("allRepliedBox");
    this.allRepliedBox.updatingHdrView = false;
  
    //notAllRepliedBox
    this.notAllRepliedBox = document.getElementById("notAllRepliedBox");
    
    this.expectReplyDateLabel = document.getElementById("ExpectReplyDateLabel");
  
    this.hdrViewIcon = document.getElementById("notAllRepliedIcon");
  
    this.notAllRepliedLabel = document.getElementById("notAllRepliedLabel");
    this.pastDeadlineLabel = document.getElementById("pastDeadlineLabel");
  
    this.notAllRepliedShowRepliesButton = document.getElementById("notAllRepliedShowRepliesButton");
  
    this.showNotRepliedButton = document.getElementById("showNotRepliedButton");

    this.notAllRepliedShowNotRepliedLabel = document.getElementById("notAllRepliedShowNotRepliedLabel"); 
    this.pastDeadlineShowNotRepliedLabel = document.getElementById("pastDeadlineShowNotRepliedLabel");
  },
  
  /**
   * This method controls the display of various elements in the header view
   * and the state of some menuitems in the otherActionsPopup */
  hdrViewDeployItems: function() {
    let msgHdr = replyManagerHdrViewListener.displayedMessage;
    this.expectReplyDateLabel.textContent = "";
    
    if (replyManagerUtils.isHdrExpectReply(msgHdr)) {
      this.expectReplyCheckbox.setAttribute("checked", "true");
      this.modifyCommand.disabled = false;
      this.expectReplyDateLabel.textContent += msgHdr.getStringProperty("ExpectReplyDate") + ".";
      this.updatingHdrView(true);
      replyManagerUtils.getNotRepliedForHdr(msgHdr, this.chooseIcon.bind(this));
    } else {
      this.expectReplyCheckbox.setAttribute("checked", "false");
      this.modifyCommand.disabled = true;
      this.allRepliedBox.collapsed = true;
      this.notAllRepliedBox.collapsed = true;
    }
  },
  
  /* This method not only changes the icon but also hide/show appropriate
   * buttons and texts below the "Expecting replies by ..." text.
   * It receives arguments according to the parameters of the callback function
   * of replyManagerUtils.getNotReplied method. */
  chooseIcon: function(aGlodaMsg, aCollection, recipients, didReply) {
    let numResponded = 0;//the number of people who have responded
    let allReplied = true;
      
    // didReply is a boolean array
    didReply.forEach(function(flag) {
      if (flag) {
        ++numResponded;
      } else {
        /* We found on peoson who have not responded, so allReplied
         * should be set to false. */
        allReplied = false;
      }
    });
    
    let nobody = this
                  .replyManagerStrings.getString("msgHdrViewButtonLabelNobody");
    let person = this
                  .replyManagerStrings.getString("msgHdrViewButtonLabelPerson");
    let people = this
                  .replyManagerStrings.getString("msgHdrViewButtonLabelPeople");
    
    if (allReplied) {
      this.allRepliedBox.collapsed = false;
      this.notAllRepliedBox.collapsed = true;
    } else {
      let msgHdr = replyManagerHdrViewListener.displayedMessage;
      this.allRepliedBox.collapsed = true;
      this.notAllRepliedBox.collapsed = false;
      
      /* Set the label of this button to the number of people responded */
      if (numResponded == 0) {
        this.notAllRepliedShowRepliesButton.textContent = nobody;
      } else if (numResponded == 1) {
        this.notAllRepliedShowRepliesButton.textContent = person;
      } else {
        this.notAllRepliedShowRepliesButton.textContent = "" + numResponded + " " + people;
      }
      
      /* Set the label of this button to the number of people not responded */
      let numNotResponded = didReply.length - numResponded;
      if (numNotResponded == 1) {
        this.showNotRepliedButton.textContent = person;
      } else {
        this.showNotRepliedButton.textContent = numNotResponded + " " + people;
      }
      
      if (isPastDeadline(msgHdr.getStringProperty("ExpectReplyDate"))) {
        /* Ok we have passed the deadline for replies so the icon will be set to the cross
         * and hide the text of the other situation. */
        this.hdrViewIcon.setAttribute("class", "replyManagerHdrViewIcon pastDeadline");
        this.expectReplyDateLabel.collapsed = true;
        this.notAllRepliedLabel.collapsed = true;
        this.pastDeadlineLabel.collapsed = false;
        this.notAllRepliedShowNotRepliedLabel.collapsed = true;
        this.pastDeadlineShowNotRepliedLabel.collapsed = false;
      } else {
        /* Set the icon to a alert and hide the past-deadline text.*/
        this.hdrViewIcon.setAttribute("class", "replyManagerHdrViewIcon notAllReplied");
        this.expectReplyDateLabel.collapsed = false;
        this.notAllRepliedLabel.collapsed = false;
        this.pastDeadlineLabel.collapsed = true;
        this.notAllRepliedShowNotRepliedLabel.collapsed = false;
        this.pastDeadlineShowNotRepliedLabel.collapsed = true;
      }
    }
    this.updatingHdrView(false);
  },
};

window.addEventListener("load", function() {replyManagerHdrViewWidget.init();});
