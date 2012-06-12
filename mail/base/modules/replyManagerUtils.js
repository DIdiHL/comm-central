/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["replyManagerUtils"];

Components.utils.import("resource://app/modules/gloda/public.js");
Components.utils.import("resource://app/modules/replyManagerCalendar.js");

var replyManagerUtils = {
  /* This attribute is set in replyManagerMailWindowOverlay.js after the window is loaded*/
  createCalendarEventEnabled: false,
  /* Get the list of email addresses who have not replied to the message
   * @param gGlodaMsg
   * @param callback function: receiving aCollection, recipients and reply status flags
   */
  getNotRepliedForGlodaMsg: function replyManagerUtils_getNotRepliedForGlodaMsg(aGlodaMsg, callback) 
  {
    var subject = aGlodaMsg.subject;
    var recipients = aGlodaMsg.recipients;
    var statusFlags = new Array(recipients.length);//true if a reply has been received from the address
    var replyCollection = [];
    for (i = 0; i != statusFlags.length; ++i) statusFlags[i] = false;
    //the number or queries we are going to make
    //when reduced to 0, invoke callback
    let counter = -1;
    let invokeCallback = function() 
    {
      if (--counter == 0)
      {
        callback(replyCollection, recipients, statusFlags);
      }
    };

    //Gloda query
    let query = Gloda.newQuery(Gloda.NOUN_CONVERSATION);
    query.subjectMatches(subject);
    query.getCollection({
      onItemsAdded: function() {},
      onItemsModified: function() {},
      onItemsRemoved: function() {},
      onQueryCompleted: function(aCollection) {
        counter = aCollection.items.length;
        for each ([i, msg] in Iterator (aCollection.items))
        {
          msg.getMessagesCollection({
            onItemsAdded: function() {},
            onItemsModified: function() {},
            onItemsRemoved: function() {},
            onQueryCompleted: function(aCollection) 
            {
              for (j = 0; j != statusFlags.length; ++j)
              {
                let currentRecipient = recipients[j];
                for each ([k, msg] in Iterator(aCollection.items))
                {
                  let from = "" + msg.from;
                  if (from.substring(from.length - currentRecipient.length) == currentRecipient && !statusFlags[j] && msg.subject == subject)
                  {
                    statusFlags[j] = true;
                    replyCollection.push(msg);
                  } 
                }
              }
              invokeCallback();
            }
          });
        }
      }
    });
  },

  getNotRepliedForHdr: function replyManagerUtils_getNotRepliedForHdr(aMsgHdr, callback) 
  {
    Gloda.getMessageCollectionForHeader(aMsgHdr, {
      onItemsAdded: function() {},
      onItemsModified: function() {},
      onItemsRemoved: function() {},
      onQueryCompleted: function(aCollection) {
        if (aCollection.items.length > 0) 
        {
          replyManagerUtils.getNotRepliedForGlodaMsg(aCollection.items[0], callback);
        }
      }
    });
  },

  /* Set ExpectReply flag to true and set the ExpectReplyDate property.
   * If the flag is already true, modify the ExpectReplyDate property.
   */
  setExpectReplyForHdr: function replyManagerUtils_setExpectReplyForHdr(aMsgHdr, aDateStr) 
  {
    aMsgHdr.setExpectReply(true);
    aMsgHdr.setStringProperty("ExpectReplyDate", aDateStr);
    if (replyManagerUtils.createCalendarEventEnabled)
      replyManagerUtils.addHdrToCalendar(aMsgHdr);
  },

  /* Reset ExpectReply flag.
   * We don't need to modify the ExpectReplyDate property because they will be set when we set the flag again.
   */
  resetExpectReplyForHdr: function replyManagerUtils_resetExpectReplyForHdr(aMsgHdr) 
  {
    aMsgHdr.setExpectReply(false);
    if (replyManagerUtils.createCalendarEventEnabled)
      replyManagerUtils.removeHdrFromCalendar(aMsgHdr);
  },

  //Add this expect reply entry to calendar
  addHdrToCalendar: function replyManagerUtils_addHdrToCalendar(aMsgHdr) {
    if (!aMsgHdr.isExpectReply) throw "Error: this email is not expecting replies!";
    if (replyManagerCalendar != null) {
      let recipients = "";
      let ccList = (aMsgHdr.ccList == "") ?  "" : ", " + aMsgHdr.ccList;
      let bccList = (aMsgHdr.bccList == "") ? "" : ", " + aMsgHdr.bccList;
      if (aMsgHdr.recipients == ccList)
        recipients = ccList.substring(2, ccList.length) + bccList;
      else if (aMsgHdr.recipients == bccList)
        recipients = bccList.substring(2, bccList.length);
      else recipients = aMsgHdr.recipients + ccList + bccList;
      let dateStr = aMsgHdr.getStringProperty("ExpectReplyDate");
      var date = new Date(dateStr);
      var status = "\"" + aMsgHdr.subject + "\" is expecting replies from " + recipients + " by " + dateStr;
      replyManagerCalendar.addEvent(date, aMsgHdr.messageId, status);
    } else throw "Error: Lightning not found!";
  },

  removeHdrFromCalendar: function replyManagerUtils_removeHdrFromCalendar(aMsgHdr) {
    replyManagerCalendar.removeEvent(aMsgHdr.id);
  }
};