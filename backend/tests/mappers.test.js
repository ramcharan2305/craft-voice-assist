import assert from "node:assert/strict";
import test from "node:test";

import { isRecordedSale } from "../services/mappers.js";

test("counts verified payments and shipped or completed orders as sales", () => {
  assert.equal(isRecordedSale({ status: "confirmed", payment_status: "verified" }), true);
  assert.equal(isRecordedSale({ status: "shipped", payment_status: "pending" }), true);
  assert.equal(isRecordedSale({ status: "completed", payment_status: "pending" }), true);
});

test("does not count pending or cancelled orders as sales", () => {
  assert.equal(isRecordedSale({ status: "pending", payment_status: "submitted" }), false);
  assert.equal(isRecordedSale({ status: "cancelled", payment_status: "verified" }), false);
});
