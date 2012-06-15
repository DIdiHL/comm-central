/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["replyManagerUtils"];

const Cu = Components.utils;
const Cc = Components.classes;

const gPrefBranch = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch(null);
Cu.import("resource://app/modules/gloda/public.js");
Cu.import("resource://app/modules/replyManagerCalendar.js");
Cu.import("resource:///modules/mailServices.js");

var replyManagerUtils = {
  /** Get the list of email addresses who have not replied to the message
   * @param aGlodaMsg
   * @param callback function: receiving three arguments - aCollection, 
                               recipients aray and reply status flags array.
   */
  getNotRepliedForGlodaMsg: function replyManagerUtils_getNotRepliedForGlodaMsg(aGlodaMsg, callback) 
  {
    aGlodaMsg.conversation.getMessagesCollection({
      onItemsAdded: function() {},
      onItemsModified: function() {},
      onItemsRemoved: function() {},
      onQueryCompleted: function(aCollection) {
        let didReply = new Array(aGlodaMsg.recipients.length);
        let recipients = new Array(aGlodaMsg.recipients.length);
      
        //We can use the "_value" property of an email's identity 
        //to get the mail address without the name of the owner.
        for (let i = 0; i != didReply.length; ++i)
        {
          didReply[i] = false;
          /* aGlodaMsg.recipients includes the To, Cc and Bcc header
           * fields so this array contains enough information.*/
          recipients[i] = aGlodaMsg.recipients[i]._value;
        }
        for (let i = 0; i != aCollection.items.length; ++i)
        {
          for (let j = 0; j != recipients.length; ++j)
          {
            //since both of them are purely mail address we can directly compare them
            if (recipients[j] == aCollection.items[i].from._value)
            {
              didReply[j] = true;
              break;
            }
          }
        }
        callback(aCollection, recipients, didReply)
      }
    });
  },

  /** getNotRepliedForHdr
   * @param aMsgHdr
   * @param callback function
   * The strategy is that we get the gloda message first then query the gloda database from that message.
   */
  getNotRepliedForHdr: function replyManagerUtils_getNotRepliedForHdr(aMsgHdr, callback) 
  {
    Gloda.getMessageCollectionForHeader(aMsgHdr, {
      onItemsAdded: function() {},
      onItemsModified: function() {},
      onItemsRemoved: function() {},
      onQueryCompleted: function(aCollection) {
        //We need to ensure that the message has been indexed
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
    aMsgHdr.markExpectReply(true, aDateStr);
    if (gPrefBranch.getBoolPref("mail.replymanager.create_calendar_event_enabled"))
      replyManagerUtils.addHdrToCalendar(aMsgHdr);
  },

  /* Reset ExpectReply flag.
   * We don't need to modify the ExpectReplyDate property because they will be set when we set the flag again.
   */
  resetExpectReplyForHdr: function replyManagerUtils_resetExpectReplyForHdr(aMsgHdr) 
  {
    aMsgHdr.markExpectReply(false, "");
    if (gPrefBranch.getBoolPref("mail.replymanager.create_calendar_event_enabled"))
      replyManagerUtils.removeHdrFromCalendar(aMsgHdr);
  },

  //Add this expect reply entry to calendar
  addHdrToCalendar: function replyManagerUtils_addHdrToCalendar(aMsgHdr) {
    if (!aMsgHdr.isExpectReply) 
      throw new Error("Error: this email is not expecting replies!");
    let headerParser = MailServices.headerParser;
    /* We need to merge the three fields and remove duplicates.
     * To make it simpler, we can create an object and make
     * each address a property of that object. This prevents
    * duplicates.*/
    let recipients = {};
    let mergeFunction = function (addressStr)
    {
      if (addressStr != "")
      {
        let addressListObj = {};
        headerParser.parseHeadersWithArray(addressStr, addressListObj, {}, {});
        for each (let recipient in addressListObj.value)
        {
          //Let's make the address the name of the property
          recipients[recipient] = true;
        }
      }
    };
    mergeFunction(aMsgHdr.recipients);
    mergeFunction(aMsgHdr.ccList);
    mergeFunction(aMsgHdr.bccList);
    let finalRecipients = Object.getOwnPropertyNames(recipients);

    let dateStr = aMsgHdr.getStringProperty("ExpectReplyDate");
    var date = new Date(dateStr);
    var status = "\"" + aMsgHdr.subject + "\" is expecting replies from " 
                      + finalRecipients + " by " + dateStr;
    replyManagerCalendar.addEvent(date, aMsgHdr.messageId, status);
  },

  removeHdrFromCalendar: function replyManagerUtils_removeHdrFromCalendar(aMsgHdr) {
    replyManagerCalendar.removeEvent(aMsgHdr.id);
  }
};