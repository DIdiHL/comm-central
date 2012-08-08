/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["replyManagerUtils"];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

const gPrefBranch = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch(null);
Cu.import("resource:///modules/gloda/public.js");
Cu.import("resource://calendar/modules/replyManagerCalendar.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource:///modules/Services.jsm");
Cu.import("resource:///modules/gloda/index_msg.js");

var replyManagerUtils = {
  /** Get the list of email addresses who have not replied to the message
   * @param aGlodaMsg
   * @param callback function: receiving four arguments - aGlodaMsg, aCollection, 
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
        for (let i = 0; i < didReply.length; ++i)
        {
          didReply[i] = false;
          /* aGlodaMsg.recipients includes the To, Cc and Bcc header
           * fields so this array contains enough information.*/
          recipients[i] = aGlodaMsg.recipients[i]._value;
        }
        for (let i = 0; i < aCollection.items.length; ++i)
        {
          for (let j = 0; j < recipients.length; ++j)
          {
            //since both of them are purely mail address we can directly compare them
            if (recipients[j] == aCollection.items[i].from._value)
            {
              didReply[j] = true;
              break;
            }
          }
        }
        callback(aGlodaMsg, aCollection, recipients, didReply)
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
          replyManagerUtils.getNotRepliedForGlodaMsg.call(this, aCollection.items[0], callback);
        }
      }
    });
  },

  /* Set ExpectReply flag to true and set the ExpectReplyDate property.
   * If the flag is already true, modify the ExpectReplyDate property.
   */
  setExpectReplyForHdr: function replyManagerUtils_setExpectReplyForHdr(aMsgHdr, aDateStr) 
  {
    markHdrExpectReply(aMsgHdr, true, aDateStr);
    
    if (gPrefBranch.getBoolPref("calendar.replymanager.create_calendar_event_enabled"))
      replyManagerUtils.addHdrToCalendar(aMsgHdr);
  },

  /* Reset ExpectReply flag.
   * We don't need to modify the ExpectReplyDate property because they will be set when we set the flag again.
   */
  resetExpectReplyForHdr: function replyManagerUtils_resetExpectReplyForHdr(aMsgHdr) 
  {
    markHdrExpectReply(aMsgHdr, false);

    /* We should attempt to remove the event regardless of the preference because an event might be created
     * before the preference was set to false. */
    replyManagerUtils.removeHdrFromCalendar(aMsgHdr);
  },
  
  /**
   * updateExpectReplyForHdr updates the Expect Reply date and the associated
   * calendar event if the feature is enabled
   * @param aMsgHdr
   * @param aDateStr is an optional parameter that, when specified, will
   *        change the expect reply date. If not this method will only 
   *        attempt to modify the calendar event's title.
   */
  updateExpectReplyForHdr: function replyManagerUtils_updateExpectReplyForHdr(aMsgHdr, aDateStr) {
    let callback = function (aGlodaMessage, aCollection, recipientsList, didReply) {
      let subject = aGlodaMessage._subject;
      let recipients = getNotRepliedRecipients(recipientsList, didReply);
      let dateStr = (aDateStr) ? aDateStr : aMsgHdr.getStringProperty("ExpectReplyDate");
      let newDate = (aDateStr) ? getDateForICalString(aDateStr) :
                                 null;
      /* When all people have replied to our email, the recipients will be an empty string.
       * In that case we need to give the event a more meaningful title.*/
      let newStatus = (recipients == "") ? 
                      "\"" + subject + "\" : All recipients have replied to this email" :
                      "\"" + subject + "\" is expecting replies from "
                      + recipients + " by " + dateStr;
      replyManagerCalendar.modifyCalendarEvent(aMsgHdr.messageId, newStatus, newDate);
    }
    if (aDateStr) {
      aMsgHdr.setStringProperty("ExpectReplyDate", aDateStr);
    }
    if (gPrefBranch.getBoolPref("calendar.replymanager.create_calendar_event_enabled"))
      replyManagerUtils.getNotRepliedForHdr(aMsgHdr, callback);
  },
  
  /* test if this message is expecting replies
   * @param aMsgHdr is an nsIMsgDBHdr object
   */
  isHdrExpectReply: function replyManagerUtils_isHdrExpectReply(aMsgHdr) {
    let isExpectReply = aMsgHdr.getStringProperty("ExpectReply");
    if (isExpectReply == "true")
      return true;
    else
      return false;
  },
  
  /**
   * Add this expect reply entry to calendar
   * @param aMsgHdr is the message header associated with this event
   */
  addHdrToCalendar: function replyManagerUtils_addHdrToCalendar(aMsgHdr) {
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

    /* If we initialized using a whole date string, the date will be 1 less
     * than the real value so we need to separete the values.
     */
    let dateStr = aMsgHdr.getStringProperty("ExpectReplyDate");
    let date = getDateForICalString(dateStr);
    let status = "\"" + aMsgHdr.subject + "\" is expecting replies from " 
                      + finalRecipients + " by " + dateStr;
    replyManagerCalendar.addEvent(date, aMsgHdr.messageId, status);
  },

  removeHdrFromCalendar: function replyManagerUtils_removeHdrFromCalendar(aMsgHdr) {
    replyManagerCalendar.removeEvent(aMsgHdr.messageId);
  },

  startReminderComposeForHdr: function replyManagerUtils_startReminderCompose(aMsgHdr) {
    replyManagerUtils.getNotRepliedForHdr(aMsgHdr, replyManagerUtils.openComposeWindow);
  },

  openComposeWindow: function replyManagerUtils_openComposeWindow(aGlodaMsg, aCollection, recipientsList, didReply) {
    let recipients = getNotRepliedRecipients(recipientsList, didReply);
    /* Create the compose window with a mailto url and the recipients and subject will
     * be automatically filled in. */
    let mailtoURL = "mailto:" + recipients + "?subject=" + aGlodaMsg._subject;
    let boilerplate = gPrefBranch.getCharPref("calendar.replymanager.boilerplate");
    // mailto uses "%0D%0A" hex sequence to represent newlines
    boilerplate = boilerplate.replace(/\n/g, "%0D%0A");
    boilerplate = boilerplate.replace(/&/g, "%26");
    mailtoURL += "&body=" + boilerplate;
    let aURI = Services.io.newURI(mailtoURL, null, null);
    MailServices.compose.OpenComposeWindowWithURI(null, aURI);
  }
};

/* Mark the given header as expecting reply
 * @param aMsgHdr is an nsIMsgDBHdr
 * @param bExpectReply is the boolean value indicating whether
 *        the message is expecting replies
 * @param aDate is the expect reply date. It must be provided if
 *        bExpectReply is true */
function markHdrExpectReply(aMsgHdr, bExpectReply, aDate) {
  let database = aMsgHdr.folder.msgDatabase;
  if (bExpectReply && aDate == null)
    throw new Error("Error: a date must be provided if bExpectReply is true");
  if (aMsgHdr.folder instanceof Ci.nsIMsgImapMailFolder) {
    database.setAttributeOnPendingHdr(aMsgHdr, "ExpectReply", bExpectReply);
    if (bExpectReply)
      database.setAttributeOnPendingHdr(aMsgHdr, "ExpectReplyDate", aDate);
  }
  aMsgHdr.setStringProperty("ExpectReply", bExpectReply);
  if (bExpectReply)
    aMsgHdr.setStringProperty("ExpectReplyDate", aDate);
  
  //We need to re-index this message to reflect the change to the Gloda attribute
  let folder = aMsgHdr.folder;
  let atomService = Cc["@mozilla.org/atom-service;1"].
                        getService(Ci.nsIAtomService);
  let keywordAtom = atomService.getAtom("Keywords");
  folder.NotifyPropertyFlagChanged(aMsgHdr, keywordAtom, null, null);
}

function getNotRepliedRecipients(recipientsList, didReply) {
  let recipients = [recipient for each ([i, recipient] in Iterator(recipientsList)) if (!didReply[i])].join(",");
  return recipients;
}

//Remove the '-' in the date string to get a date string used by iCalString
function getDateForICalString(aDateStr) {
  let year = aDateStr.substr(0, 4);
  let month = aDateStr.substr(5, 2);
  let date = aDateStr.substr(8, 2);
  return year + month + date;
}

/* Gloda attribute provider
 * the isExpectReply attribute of the message header is contributed to
 * Gloda so that we can query messages marked isExpectReply. I need to 
 * get a collection of such messages to display them collectively. */
var isExpectReply = {

  init: function() {
    this.defineAttribute();
  },
  
  defineAttribute: function() {
    this._isExpectReplyAttribute = Gloda.defineAttribute({
      provider: this,
      extensionName: "replyManager",
      attributeType: Gloda.kAttrExplicit,
      attributeName: "isExpectReply",
      bind: true,
      singular: true,
      canQuery: true,
      subjectNouns: [Gloda.NOUN_MESSAGE],
      objectNoun: Gloda.NOUN_BOOLEAN,
      parameterNoun: null,
    });
  },

  process: function(aGlodaMessage, aRawReps, aIsNew, aCallbackHandle) {
    aGlodaMessage.isExpectReply = 
           replyManagerUtils.isHdrExpectReply(aRawReps.header);
    yield Gloda.kWorkDone;
  }
};
isExpectReply.init();
