# Evaluation results

80 text messages: 40 scams and 40 ordinary messages. See eval/README.md for the dataset and method.

## Counting "Scam" or "Be careful" as a warning

| Setup | Precision | Recall | F1 | False alarms on ordinary texts | Errors |
| --- | --- | --- | --- | --- | --- |
| checks-only | 80% | 10% | 18% | 3% (1/40) | 0 |
| llm-only | 66% | 100% | 80% | 50% (20/40) | 1 |
| llm+checks | 71% | 100% | 83% | 40% (16/40) | 1 |

## Counting only "Scam" as a warning

| Setup | Precision | Recall | F1 | False alarms on ordinary texts | Errors |
| --- | --- | --- | --- | --- | --- |
| checks-only | n/a | 0% | n/a | 0% (0/40) | 0 |
| llm-only | 94% | 85% | 89% | 5% (2/40) | 1 |
| llm+checks | 100% | 79% | 89% | 0% (0/40) | 1 |

## Verdicts by setup

| Setup | Label | Scam | Be careful | Looks safe |
| --- | --- | --- | --- | --- |
| checks-only | scam | 0 | 4 | 36 |
| checks-only | ham | 0 | 1 | 39 |
| llm-only | scam | 33 | 6 | 0 |
| llm-only | ham | 2 | 18 | 20 |
| llm+checks | scam | 31 | 8 | 0 |
| llm+checks | ham | 0 | 16 | 24 |

## Time per message (median)

- checks-only: 0.0 s
- llm-only: 1.5 s
- llm+checks: 1.5 s

## Where the shipped setup (llm+checks) was wrong

- **sms-3876**, labelled ham, we said suspicious: "Mm so you asked me not to call radio"
- **sms-3013**, labelled ham, we said suspicious: "WHEN THE FIRST STRIKE IS A RED ONE. THE BIRD + ANTELOPE BEGIN TOPLAY IN THE FIELDOF SELFINDEPENDENCE BELIEVE THIS + THE FLOWER OF CONTENTION WILL GROW.RANDOM!"
- **sms-3722**, labelled ham, we said suspicious: "Yup. Wun believe wat? U really neva c e msg i sent shuhui?"
- **sms-5589**, labelled ham, we said suspicious: "What???? Hello wats talks email address?"
- **sms-3979**, labelled ham, we said suspicious: "I will take care of financial problem.i will help:)"
- **sms-2891**, labelled ham, we said suspicious: "HEY THERE BABE, HOW U DOIN? WOT U UP 2 2NITE LOVE ANNIE X."
- **sms-3290**, labelled ham, we said suspicious: "Could you not read me, my Love ? I answered you"
- **sms-1731**, labelled ham, we said suspicious: "Today my system sh get ready.all is well and i am also in the deep well"
- **sms-2295**, labelled ham, we said suspicious: "What do u want when i come back?.a beautiful necklace as a token of my heart for you.thats what i will give but ONLY to MY WIFE OF MY LIKING.BE THAT AND SEE..NO ONE can give you that.dont call me.i will wait till i come."
- **sms-2809**, labelled ham, we said suspicious: "Please attend the phone:)"
- **sms-2029**, labelled ham, we said suspicious: "Message:some text missing* Sender:Name Missing* *Number Missing *Sent:Date missing *Missing U a lot thats y everything is missing sent via fullonsms.com"
- **sms-1725**, labelled ham, we said suspicious: "En chikku nange bakra msg kalstiya..then had tea/coffee?"
- **sms-2375**, labelled ham, we said suspicious: "Have you finished work yet? :)"
- **sms-3821**, labelled ham, we said suspicious: "Yo, call me when you get the chance, a friend of mine wanted me to ask you about a big order"
- **sms-1069**, labelled ham, we said suspicious: "I need to come home and give you some good lovin..."
- **sms-5770**, labelled ham, we said suspicious: "Jus ans me lar. U'll noe later."
