// Example messages for the web checker, so people can see a result without finding a scam first.
// The two scams copy common real patterns; their websites are made up.
export const SAMPLES = [
  {
    label: "Parcel text",
    text: `From: +1 (844) 902-3317

USPS: Your package US9514901185421 could not be delivered due to an incomplete address. Please update your details within 12 hours or the parcel will be returned to sender. A redelivery fee of $1.99 applies.

Update now: https://usps-redelivery-track.info/us`,
  },
  {
    label: "Bank KYC text",
    text: `From: VM-SBIUPD

Dear Customer, your SBI YONO account will be blocked today as your PAN card is not updated. Update KYC immediately to avoid suspension: http://sbi-kyc-update.in/yono

Do not share this message. -SBI`,
  },
  {
    label: "Message from a friend",
    text: `From: Priya

Hey! Are we still on for Saturday? I booked the table at Olive for 7:30 under my name. Bring the board games if you can.`,
  },
];
