/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Lin Han.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
var EXPORTED_SYMBOLS = ["replyManagerUtils"];

Components.utils.import("resource://app/modules/gloda/public.js");
Components.utils.import("resource://app/modules/replyManagerCalendar.js");

var replyManagerUtils = {
  /* Get the list of email addresses who have not replied to the message
   * @param gGlodaMsg
   * @param callback function: receiving aCollection, recipients and reply status flags
   */
  getNotRepliedForGlodaMsg: function replyManagerUtils_getNotRepliedForGlodaMsg(aGlodaMsg, callback) {
    var subject = aGlodaMsg.subject;
    var recipients = aGlodaMsg.recipients;
    var statusFlags = new Array(recipients.length);//true if a reply has been received from the address
    var replyCollection = [];
    for (i = 0; i != statusFlags.length; ++i) statusFlags[i] = false;
    //the number or queries we are going to make
    //when reduced to 0, invoke callback
    let counter = -1;
    let invokeCallback = function() {
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
            onQueryCompleted: function(aCollection) {
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

  getNotRepliedForHdr: function replyManagerUtils_getNotRepliedForHdr(aMsgHdr, callback) {
    Gloda.getMessageCollectionForHeader(aMsgHdr, {
      onItemsAdded: function() {},
      onItemsModified: function() {},
      onItemsRemoved: function() {},
      onQueryCompleted: function(aCollection) {
        if (aCollection.items.length > 0) {
          replyManagerUtils.getNotRepliedForGlodaMsg(aCollection.items[0], callback);
        }
      }
    });
  },

  /* Set ExpectReply flag to true and set the ExpectReplyDate property.
   * If the flag is already true, modify the ExpectReplyDate property.
   */
  setExpectReplyForHdr: function replyManagerUtils_setExpectReplyForHdr(aMsgHdr, aDateStr) {
    aMsgHdr.setExpectReply(true);
    aMsgHdr.setStringProperty("ExpectReplyDate", aDateStr);
    let pref = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch)
                    .getBranch("replymanager.");
    if (pref.getBoolPref("create_calendar_event_enabled"))
      replyManagerUtils.addHdrToCalendar(aMsgHdr);
  },

  /* Reset ExpectReply flag.
   * We don't need to modify the ExpectReplyDate property because they will be set when we set the flag again.
   */
  resetExpectReplyForHdr: function replyManagerUtils_resetExpectReplyForHdr(aMsgHdr) {
    aMsgHdr.setExpectReply(false);
    let pref = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch)
                    .getBranch("replymanager.");
    if (pref.getBoolPref("create_calendar_event_enabled"))
      replyManagerUtils.removeHdrFromCalendar(aMsgHdr);
  },

  //Add this expect reply entry to calendar
  addHdrToCalendar: function replyManagerUtils_addHdrToCalendar(aMsgHdr) {
    if (!aMsgHdr.isExpectReply) throw "Error: this email is not expecting replies!";
    replyManagerCalendar.init();
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