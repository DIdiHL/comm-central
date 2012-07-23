/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var Cu = Components.utils;

Cu.import("resource:///modules/gloda/public.js");
Cu.import("resource:///modules/gloda/gloda.js");
Cu.import("resource:///modules/gloda/index_msg.js");
Cu.import("resource:///modules/gloda/indexer.js");
Cu.import("resource:///modules/Services.jsm");

var MODULE_NAME = "replymanager-helpers";
var RELATIVE_ROOT = '../shared-modules'
var MODULE_REQUIRES = ["folder-display-helpers"];

var fdh, mc;

function setupModule() {
  fdh = collector.getModule("folder-display-helpers");
  mc = fdh.mc;
}

function installInto(module) {
  setupModule();
  
  //Now copy helper functions
  module.assert_element_disabled = assert_element_disabled;
  module.assert_element_not_disabled = assert_element_not_disabled;
  module.assert_element_collapsed = assert_element_collapsed;
  module.assert_element_not_collapsed = assert_element_not_collapsed;
  module.wait_for_indexing = wait_for_indexing;
  module.assertionHelper = new assertionHelperClass();
  module.plan_for_reply_manager_update = plan_for_reply_manager_update;
  module.wait_for_reply_manager_update = wait_for_reply_manager_update;
}

/* Assert that the element is disabled
 * @param aElt is the elementlibs.Elem
 * @param aWhy The error message in case of failure
 */
function assert_element_disabled(aElt) {
  mc.assertDOMProperty(aElt, "disabled", "true");
}

function assert_element_not_disabled(aElt) {
  mc.assertDOMProperty(aElt, "disabled", "false");
}

/* Asser that the element is collapsed
 * the helper function provided by dom-helpers only tests for hidden
 * so I added this */
function assert_element_collapsed(aElt) {
  mc.assertJSProperty(aElt, "collapsed", "true");
}

function assert_element_not_collapsed(aElt, aWhy) {
  mc.assertJSProperty(aElt, "collapsed", "false");
}

function wait_for_indexing(aMsgHdrs) {
  GlodaIndexer._unitTestSuperVerbose = true;
  GlodaMsgIndexer._unitTestSuperVerbose = true;

  // Not very subtle. Works. Yay.
  GlodaMsgIndexer.indexMessages([
    [x.folder, x.messageKey]
    for each ([, x] in Iterator(aMsgHdrs))
  ]);
  GlodaIndexer.callbackDriver();

  let done = false;
  let make_query = function () {
    Gloda.getMessageCollectionForHeaders(aMsgHdrs, {
      onItemsAdded: function (aItems) {
      },
      onItemsModified: function () {},
      onItemsRemoved: function () {},
      onQueryCompleted: function (aCollection) {
        let l = aCollection.items.length;
        if (l != aMsgHdrs.length) {
          mc.window.setTimeout(make_query, 100);
        } else {
          done = true;
        }
      },
    });
  };
  make_query();
  mc.waitFor(function () done, "Messages never were indexed");
}

/* We need to wait for the Gloda query to finish changing
   * the elements. */
function plan_for_reply_manager_update() {
  let o = {
    value: null,
  };
  
  let observer = {
    observe: function(aSubject, aTopic, aData) {
      if (aTopic == "ReplyManager" && aData == "Updated") 
        o.value = true;
      else
        o.value = false;
      Services.obs.removeObserver(observer);
    },
  };
  Services.obs.addObserver(observer, "ReplyManager", false);
  
  return o;
}

function wait_for_reply_manager_update(observer) {
  mc.waitFor(function() observer.value != null);
}

/* an assertionHelper instance contains all elements required for
 * testing. */
function assertionHelperClass() {
  this.allRepliedBox = mc.eid("allRepliedBox");
  this.notAllRepliedBox = mc.eid("notAllRepliedBox");
  this.modifyExpectReplyCommand = mc.eid("cmd_hdrViewModifyExpectReply");
  this.notAllRepliedIcon = mc.eid("notAllRepliedIcon");
  this.notAllRepliedLabel = mc.eid("notAllRepliedLabel");
  this.pastDeadlineLabel = mc.eid("pastDeadlineLabel");
  this.notAllRepliedShowNotRepliedLabel = mc.eid
    ("notAllRepliedShowNotRepliedLabel");
  this.pastDeadlineShowNotRepliedLabel = mc.eid
    ("pastDeadlineShowNotRepliedLabel");
  this.otherActionsButton = mc.eid("otherActionsButton");
  this.toggleExpectReply = mc.eid("hdrViewExpectReplyCheckbox");
  this.modifyExpectReplyItem = mc.eid("hdrViewModifyExpectReplyItem");
  this.replyManagerMailContextMenu = mc.eid("replyManagerMailContextMenu");
  this.mailContextToggleExpectReply = mc.eid("expectReplyCheckbox"); 
}

assertionHelperClass.prototype = {
  allRepliedBox: null,
  notAllRepliedBox: null,
  modifyExpectReplyCommand: null,
  notAllRepliedIcon: null,
  notAllRepliedLabel: null,
  pastDeadlineLabel: null,
  notAllRepliedShowNtRepliedLabel: null,
  pastDeadlineShowNotRepliedLabel: null,
  otherActionsButton: null,
  toggleExpectReply: null,
  modifyExpectReplyItem: null,
  replyManagerMailContextMenu: null,
  mailContextToggleExpectReply: null,
  

  /* Assert that both the allRepliedBox and the notAllRepliedBox are
   * collapsed. This is the case when msgHdr.isExpectReply is false*/
  assert_both_collapsed: function() {
    assert_element_disabled(this.modifyExpectReplyCommand);

    assert_element_collapsed(this.allRepliedBox);

    assert_element_collapsed(this.notAllRepliedBox);
  },
  
  /* Note that when allRepliedBox is shown, the notAllRepliedBox
   * should be collapsed. This is the case when all recipients
   * have responded */
  assert_allRepliedBox_shown: function() {
    assert_element_not_disabled(this.modifyExpectReplyCommand);
    assert_element_not_collapsed(this.allRepliedBox);
    assert_element_collapsed(this.notAllRepliedBox);
  },
  
  /* When within the deadline:
   *  The icon class should be notAllReplied;
   *  Only notAllRepliedLabel is shown;
   *  Only notAllRepliedShowNotRepliedLabel is shown;
   */
  assert_within_deadline_not_all_replied: function() {
    assert_element_not_disabled(this.modifyExpectReplyCommand);
    mc.assertDOMProperty(this.notAllRepliedIcon, "class",
      "replyManagerHdrViewIcon notAllReplied");
    assert_element_collapsed(this.allRepliedBox);
    assert_element_not_collapsed(this.notAllRepliedBox);
    assert_element_not_collapsed(this.notAllRepliedLabel);
    assert_element_collapsed(this.pastDeadlineLabel);
    assert_element_not_collapsed(this.notAllRepliedShowNotRepliedLabel);
    assert_element_collapsed(this.pastDeadlineShowNotRepliedLabel);
  },
  
  /* This should be the other way around from the above method */
  assert_past_deadline_not_all_replied: function() {
    assert_element_not_disabled(this.modifyExpectReplyCommand);
    mc.assertDOMProperty(this.notAllRepliedIcon, "class",
      "replyManagerHdrViewIcon pastDeadline");
    assert_element_collapsed(this.allRepliedBox);
    assert_element_not_collapsed(this.notAllRepliedBox);
    assert_element_collapsed(this.notAllRepliedLabel);
    assert_element_not_collapsed(this.pastDeadlineLabel);
    assert_element_collapsed(this.notAllRepliedShowNotRepliedLabel);
    assert_element_not_collapsed(this.pastDeadlineShowNotRepliedLabel);
  },
};
