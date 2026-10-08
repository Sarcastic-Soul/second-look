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

## What we found

Full numbers are in [RESULTS.md](RESULTS.md). Run on 8 Oct 2026 with `gemini-3.5-flash-lite`, the
model most live checks use (the main model's free tier allows 20 requests a day).

- **The AI never called a scam text "Looks safe".** All 39 scams it answered got "Scam" or "Be careful",
  with and without the checks.
- **When it says "Scam", it's right.** With the checks: 31 of 31 "Scam" answers were real scams (100%
  precision), and no ordinary text was called a scam. Without the checks, 2 ordinary texts were.
- **It is too cautious with short personal texts.** 16 of 40 ordinary texts (40%) got "Be careful":
  messages like "Please attend the phone:)" or "Have you finished work yet? :)" from an unknown number,
  with no context. That's the main weakness this run shows.
- **The checks alone catch almost nothing in text messages** (4 of 40 scams). Most scam texts here
  ask you to call or text a number and have no link, and there's no sender address or signature to
  check. The checks are built for emails and links, which this dataset doesn't test.
- **Checks vs. no checks is mostly noise here.** The two AI setups disagreed on 8 messages, and in 7 of
  them no check had found anything, so the difference came from the prompt and the model's randomness,
  not the evidence. 80 messages without links can't show what the checks add.
- **One message failed both times.** A sexual premium-number scam (sms-4365) made the model stop
  mid-answer, likely Gemini's safety filter. The live app would fall back to the checks, which found
  nothing, and answer "Looks safe" with a note that the AI was unavailable. It's counted as an error.
- **A bug the run found:** in "MY LIKING.BE THAT", the missing space made the checks read `liking.be` as
  a website. Bare website names written in capitals mid-sentence can be false positives.

## Run it

```sh
# 1. Download Dataset_5971.zip from the Mendeley page and unzip it into eval/data/sms/
python3 -I eval/sample.py 40   # writes eval/sample.jsonl (already committed)
GEMINI_MODEL=gemini-3.5-flash-lite bun run eval   # appends to eval/results.jsonl; safe to stop and rerun
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
