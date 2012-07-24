/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Test whether the expect-reply elements in the message header are
 * correctly shown/hidden or disabled/enabled.*/
var MODULE_NAME = "test-expect-reply-display";

var RELATIVE_ROOT = '../shared-modules';
var MODULE_REQUIRES = ['folder-display-helpers', 'window-helpers',
                       'dom-helpers', 'pref-window-helpers',
                       'replymanager-helpers'];
var elib = {};
Cu.import('resource://mozmill/modules/elementslib.js', elib);
Cu.import("resource:///modules/replyManagerUtils.js");


var folder;
var gTestMessage;

    
function setupModule(module) {
  let fdh = collector.getModule('folder-display-helpers');
  fdh.installInto(module);
  let wh = collector.getModule('window-helpers');
  wh.installInto(module);
  let dh = collector.getModule("dom-helpers");
  dh.installInto(module);
  let pwh = collector.getModule('pref-window-helpers');
  pwh.installInto(module);
  let rh = collector.getModule('replymanager-helpers');
  rh.installInto(module);
  
  //enable Gloda for the test set
  Services.prefs.setBoolPref("mailnews.database.global.indexer.enabled", true);
  
  folder = create_folder("reply-manager-test-folder");
  
  /* We'll mainly change this message to test the header pane elements*/
  gTestMessage = create_message({
    subject: "People never reply to this email.",
    from:["Len", "len@somewhere.com"],
    to:[["Miku", "miku@somewhere.com"]],
    toCount: 1,
  });
  
  /* This message will be changed while the first message is being
   * displayed.*/
  let message2 = create_message({
    subject: "This will be changed",
    to:[["Luka", "luka@somewhere.com"]],
    toCount: 1,
  });
  
  add_message_to_folder(folder, gTestMessage);
  add_message_to_folder(folder, message2);
}

/* Test whether the elements are correctly collapsed
 * when isExpectReply is false */
function test_not_expect_reply() {
  be_in_folder(folder);
  
  let curMessage = select_click_row(0);
  assert_selected_and_displayed(mc, curMessage);
  
  /* This is a blank message so both allRepliedBox and notAllRepliedBox
   * should be collapsed */
  assertionHelper.assert_both_collapsed();
}

/* This is when isExpectReply is true and we are still
 * within deadline. */
function test_expect_reply_within_deadline() {
  be_in_folder(folder);
  let curMessage = select_click_row(0);
  wait_for_indexing([curMessage]);
  
  /* set isExpectReply to true and the expect reply date to
   * today's date. */
  plan_for_modal_dialog("replyManagerDateDialog", function(ac){
    let curDialog = ac.window.document.getElementById("replyManagerDateDialog");
    let acceptButton = new elib.Elem(curDialog.getButton("accept"));
    ac.click(acceptButton);
  });
  let observer = plan_for_reply_manager_update();
  mc.click(assertionHelper.otherActionsButton);
  mc.click(assertionHelper.toggleExpectReply);
  wait_for_modal_dialog("replyManagerDateDialog");
  wait_for_reply_manager_update(observer);
  
  //The expect reply date is today and not all replied
  assertionHelper.assert_within_deadline_not_all_replied();
}

/* This is when isExpectReply is true and the deadline is passed*/
function test_expect_reply_past_deadline() {
  // set the expect reply date to some day prior to today's date.
  plan_for_modal_dialog("replyManagerDateDialog", function(ac){
    let curDialog = ac.window.document.getElementById("replyManagerDateDialog");
    let acceptButton = new elib.Elem(curDialog.getButton("accept"));
    let datePicker = ac.window.document.getElementById("replyManagerDatePicker");
    datePicker.value = "2011-01-01";
    ac.click(acceptButton);
  });
  let observer = plan_for_reply_manager_update();
  mc.click(assertionHelper.otherActionsButton);
  mc.click(assertionHelper.modifyExpectReplyItem);
  wait_for_modal_dialog("replyManagerDateDialog");
  wait_for_reply_manager_update(observer);  
  
  assertionHelper.assert_past_deadline_not_all_replied();
}

/* This is when all people have replied to this email */
function test_all_replied() {
  //add a message in-reply-to the gTestMessage
  let aReply = create_message({
    subject: "People never reply to this email.",
    to:[["Len", "len@somewhere.com"]],
    toCount: 1,
    inReplyTo: gTestMessage,
  });
  add_message_to_folder(folder, aReply);
  
  //Get the header and make sure it gets indexed
  let aReplyHdr = select_click_row(2);
  wait_for_indexing([aReplyHdr]);
  
  let observer = plan_for_reply_manager_update();
  let curMessage = select_click_row(0);
  wait_for_reply_manager_update(observer);
  
  assertionHelper.assert_allRepliedBox_shown();
}

/* Test that modifying the expect-reply status of a message other
 * than the displayed on will not affect the one currently being
 * displayed. */
function test_modify_non_displayed_email() {
  // first unmark the current message
  mc.click(assertionHelper.otherActionsButton);
  mc.click(assertionHelper.toggleExpectReply);
  assertionHelper.assert_both_collapsed();
  
  let aReplyHdr = right_click_on_row(2);
  /* set isExpectReply to true and the expect reply date to
   * today's date. */
  plan_for_modal_dialog("replyManagerDateDialog", function(ac){
    let curDialog = ac.window.document.getElementById("replyManagerDateDialog");
    let acceptButton = new elib.Elem(curDialog.getButton("accept"));
    ac.click(acceptButton);
  });
  let observer = plan_for_reply_manager_update();
  mc.click(assertionHelper.replyManagerMailContextMenu);
  mc.click(assertionHelper.mailContextToggleExpectReply);
  wait_for_modal_dialog("replyManagerDateDialog");
  wait_for_reply_manager_update(observer);  

  /* assert that marking a non-displayed message expect-reply won't
   * affect the current message header pane. */
  assertionHelper.assert_both_collapsed();
}
