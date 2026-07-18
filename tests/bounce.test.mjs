import { describe, expect, it } from "vitest";
import { isPermanentSendFailure, parseSesSnsMessage } from "../netlify/functions/_shared/bounce.mjs";

describe("bounce helpers", () => {
  describe("isPermanentSendFailure", () => {
    it("detects permanent-looking SES errors", () => {
      expect(isPermanentSendFailure("Mailbox does not exist")).toBe(true);
      expect(isPermanentSendFailure("Address is suppressed")).toBe(true);
      expect(isPermanentSendFailure("Message rejected permanently")).toBe(true);
    });

    it("ignores empty or transient messages", () => {
      expect(isPermanentSendFailure("")).toBe(false);
      expect(isPermanentSendFailure("Temporary network issue")).toBe(false);
    });
  });

  describe("parseSesSnsMessage", () => {
    it("parses permanent bounce notifications", () => {
      const recipients = parseSesSnsMessage({
        notificationType: "Bounce",
        bounce: {
          bounceType: "Permanent",
          bounceSubType: "Suppressed",
          bouncedRecipients: [{ emailAddress: "bad@example.com" }],
        },
      });

      expect(recipients).toEqual([
        {
          email: "bad@example.com",
          kind: "bounce",
          permanent: true,
          reason: "Permanent · Suppressed",
        },
      ]);
    });

    it("parses complaint notifications", () => {
      const recipients = parseSesSnsMessage({
        notificationType: "Complaint",
        complaint: {
          complaintFeedbackType: "abuse",
          complainedRecipients: [{ emailAddress: "spam@example.com" }],
        },
      });

      expect(recipients).toEqual([
        {
          email: "spam@example.com",
          kind: "complaint",
          permanent: true,
          reason: "abuse",
        },
      ]);
    });

    it("returns an empty list for unknown events", () => {
      expect(parseSesSnsMessage({ notificationType: "Delivery" })).toEqual([]);
    });
  });
});
