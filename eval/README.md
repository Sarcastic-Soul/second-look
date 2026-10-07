# Evaluation

How well does Second Look tell scam texts from ordinary ones, and do the technical checks help
the AI or just add noise?

## Dataset

"SMS Phishing Dataset for Machine Learning and Pattern Recognition" by Sandhya Mishra and Devpriya
Soni, Mendeley Data, V1, 2022 ([doi:10.17632/f45bkkt8pr.1](https://doi.org/10.17632/f45bkkt8pr.1)).
5,971 text messages labelled ham, spam or smishing.

We compare **smishing** (scam texts) against **ham** (ordinary texts). Plain **spam** is left out on
purpose: Second Look is told to call ordinary marketing "Looks safe", so spam has no right answer for it.

`sample.py` draws 40 of each with a fixed seed (42), after removing duplicates and messages under
20 characters. The sample is in `sample.jsonl`, so anyone can rerun on the same messages.

We first tried a popular phishing **email** dataset (zefang-liu/phishing-email-dataset on Hugging
Face). Its "phishing" class turned out to be mostly generic spam and gibberish, with text that had
been lowercased and split into tokens, so links were broken. That would have measured the wrong thing,
so we dropped it.

## Setups

| Setup | What it is |
| --- | --- |
| checks-only | The technical checks alone (copycat website names, website age, where short links lead, links that don't match the company named) with a simple rule: 2 problems = Scam, 1 problem = Be careful, nothing found = Looks safe |
| llm-only | Gemini reading the message alone, same prompt and evidence rules, no check results |
| llm+checks | What Second Look ships: Gemini with the check results |

## Run it

```sh
# 1. Download Dataset_5971.zip from the Mendeley page and unzip it into eval/data/sms/
python3 -I eval/sample.py 40   # writes eval/sample.jsonl (already committed)
bun run eval                    # appends to eval/results.jsonl; safe to stop and rerun
bun run eval:report             # writes eval/RESULTS.md
```

`bun run eval` needs `GEMINI_API_KEY` in `.env`. It waits 4 seconds between AI calls to stay inside
the free tier (`EVAL_DELAY_MS` to change).

## Limits

- 80 messages is small. Treat a few points of difference as noise.
- The scam texts are mostly older UK prize and premium-number scams, read from screenshots by the
  dataset's authors. Today's parcel and bank-KYC scams look different.
- Text messages have no sender address or digital signature, so the email checks never run here.
  Most scam texts in this set have a phone number and no link, which leaves little for the website
  checks to look at.
