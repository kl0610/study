# -*- coding: utf-8 -*-
"""The passages for printed pages 103 to 120 of the Sherlock reader.

Word for word out of the book, typed with the spaces the PDF's text layer drops
("ofmy", "me,and") and checked back against it letter by letter. Four scenes,
which are the four chapters of the quiz:

  1  103-107  the drive out, the dark house, the woman's first warning
  2  108-111  Ferguson, the machine, and the question he should not have asked
  3  113-117  the ceiling, the panel, the window, the cleaver
  4  118-120  the hedge by the station, the advertisement, Bradstreet's circle

Printed page = PDF page - 13 in this book. Every page carries its own number in
the running head and again in the printer's mark at the foot, and both agree.
"""

PASSAGES = {

    # ---------------------------------------------- chapter 1: 103 to 107
    "horse": {
        "title": "Holmes stops him to ask about the horse",
        "cite": "Reader, pages 103–104",
        "text": [
            "Without a word he grasped my arm and hurried me into a carriage.",
            "He drew up the windows on either side and away we went, as hard as the horse could go.",
            "“One horse?” interjected Holmes.",
            "“Yes, only one.”",
            "“Did you observe the color?”",
            "“Yes, it was a chestnut.”",
            "“Tired-looking or fresh?”",
            "“Oh, fresh and glossy.”",
            "“Thank you. Pray continue your tale.”",
        ],
    },
    "drive": {
        "title": "An hour in the dark, and no way to see out",
        "cite": "Reader, page 104",
        "text": [
            "We drove for at least an hour.",
            "Colonel Stark had said that it was only seven miles, but I think that it must have been nearer twelve.",
            "He sat in silence all the time, and I was aware that he was looking at me with great intensity.",
            "I tried to look out of the windows to see something of where we were, but they were made of frosted glass, and I could make out nothing except an occasional blur of passing light.",
            "Now and then I hazarded some remark to break the boredom of the journey, but the Colonel answered only in grunts.",
        ],
    },
    "porch": {
        "title": "Straight out of the carriage and into the hall",
        "cite": "Reader, page 104",
        "text": [
            "At last, however, the carriage came to a stand.",
            "Colonel Lysander Stark sprang out, and, as I followed, pulled me swiftly on a porch in front of us.",
            "We stepped, as it were, right out of the carriage and into the hall, so that I failed to catch even the most fleeting glance of the front of the house.",
            "The instant that I had crossed the threshold the door slammed heavily behind us, and I heard faintly the rattle of the wheels as the carriage drove away.",
            "It was pitch dark in the house.",
        ],
    },
    "books": {
        "title": "German books, and a shutter across the window",
        "cite": "Reader, page 105",
        "text": [
            "A woman appeared with a lamp in her hand, peering at us.",
            "She spoke a few words in a foreign tongue as though asking a question, and when my companion answered gruffly, she gave such a start that the lamp nearly fell from her hand.",
            "It was a little plain room, with a round table in the center, on which several German books were scattered.",
            "I glanced at the books upon the table, and in spite of my ignorance of German, I could see that two of them were treatises on science, the other being poetry.",
            "Then I walked across to the window, hoping that I might catch some glimpse of the countryside, but an oak shutter was folded across it.",
        ],
    },
    "warn": {
        "title": "“There is no good for you to do”",
        "cite": "Reader, page 106",
        "text": [
            "An uneasiness began to steal over me.",
            "Who were these German people, and what were they doing living in this strange, out-of-the-way place?",
            "And where was the place?",
            "I was ten miles or so from Eyford, that was all I knew.",
            "I could see that she was sick with fear, and the sight sent a chill to my own heart.",
            "She held up one shaking finger to warn me to be silent, and she shot a few words of broken English at me, her eyes glancing back into the gloom behind her.",
            "“I would go,” said she, trying hard to speak calmly. “There is no good for you to do.”",
            "“It is not worth your while to wait,” she went on. “You can pass through the door; no one hinders.”",
        ],
    },

    # ---------------------------------------------- chapter 2: 108 to 111
    "plea": {
        "title": "She asks a second time, and he stays anyway",
        "cite": "Reader, page 108",
        "text": [
            "“For the love of Heaven!” she whispered, “get away before it is too late!”",
            "But I am somewhat headstrong by nature.",
            "I thought of my fifty-guinea fee, of my wearisome journey, and the unpleasant night that seemed to be before me.",
            "Was it all for nothing?",
            "Why should I slink away without having carried out my commission, and without the payment that was my due?",
            "With a stout bearing, therefore, I declared my intention of remaining where I was.",
        ],
    },
    "door": {
        "title": "The draught, and who opened the door",
        "cite": "Reader, pages 108–109",
        "text": [
            "The newcomers were Colonel Lysander Stark and a short thick man with a beard growing out of his double chin, who was introduced to me as Mr. Ferguson.",
            "“This is my secretary and manager,” said the Colonel.",
            "“By the way, I was under the impression that I left this door shut. I fear that you have felt the draught.”",
            "“On the contrary,” said I, “I opened the door myself, because I felt the room to be a little close.”",
            "He shot one of his suspicious glances at me.",
            "“Perhaps we had better proceed to business, then,” said he.",
        ],
    },
    "house": {
        "title": "A machine indoors, and a house with nothing in it",
        "cite": "Reader, page 109",
        "text": [
            "“I had better put my hat on, I suppose.”",
            "“Oh no, it is in the house.”",
            "“What, you dig fuller’s earth in the house?”",
            "“No, no. This is only where we compress it.”",
            "It was a mysterious old house, with passages, narrow winding staircases, and little low doors.",
            "There were no carpets, no signs of any furniture above the ground floor, and plaster was peeling off the walls.",
            "Ferguson seemed a gloomy, silent man, but I could see from the little he said that he was at least a fellow Englishman.",
        ],
    },
    "inside": {
        "title": "“We are now actually within the hydraulic press”",
        "cite": "Reader, page 110",
        "text": [
            "“We are now,” said he, “actually within the hydraulic press, and it would be particularly unpleasant for us if anyone were to turn it on.”",
            "“The ceiling of this small chamber is really the end of the descending piston, and it comes down with the force of many tons upon this metal floor.”",
            "When I pressed down the levers that controlled it, I knew at once by the whishing sound that there was a slight leakage.",
            "An examination showed that one of the rubber bands around the end of a driving-rod had shrunk so as not quite to fill the socket along which it worked.",
            "This was clearly the cause of the loss of power, and I pointed it out to my companions, who asked several practical questions as to how they should set it right.",
        ],
    },
    "trough": {
        "title": "The crust in the iron trough, and one question too many",
        "cite": "Reader, page 111",
        "text": [
            "It was obvious that the story of the fuller’s earth was a fabrication, for it would be absurd to suppose that so powerful an engine could be designed for so small a purpose.",
            "The walls were of wood, but the floor consisted of a large iron trough, and I could see a crust of metallic deposit all over it.",
            "I was scraping at it to see exactly what it was, when I heard an exclamation in German, and saw the ghostly face of the Colonel looking down at me.",
            "“I think that I would be better able to advise you as to your machine,” said I, “if I knew what the exact purpose was for which it was used.”",
            "The instant that I uttered the words I regretted the rashness of my speech.",
            "A sinister light sprang up in his grey eyes.",
            "“Very well,” said he, “you shall know all about the machine.”",
            "He took a step backward, slammed the door, and turned the key in the lock.",
        ],
    },

    # ---------------------------------------------- chapter 3: 113 to 117
    "ceiling": {
        "title": "The ceiling comes down",
        "cite": "Reader, page 113",
        "text": [
            "And then suddenly in the silence I heard the clank of the levers and the swish of the leaking cylinder.",
            "He had set the engine at work.",
            "By its light I saw that the black ceiling was coming down on me, slowly, jerkily, but, as none knew better than myself, with a force that must grind me to a shapeless pulp.",
            "I begged the Colonel to let me out, but the remorseless clanking of the levers drowned my cries.",
            "The ceiling was only a foot or two above my head, and with my hand I could feel its hard rough surface.",
            "Already I was unable to stand erect, when my eye caught something that brought a gush of hope back.",
        ],
    },
    "panel": {
        "title": "Iron above and below, wood at the sides",
        "cite": "Reader, page 114",
        "text": [
            "Though the floor and ceiling were of iron, the walls were of wood.",
            "As I gave a last hurried glance around, I saw a thin line of yellow light between two of the boards, which broadened as a small panel was pushed backwards.",
            "I could hardly believe that here was indeed a door that led away from death.",
            "I threw myself through it and lay half fainting upon the other side.",
            "The panel had closed again behind me, but the clang of the two slabs of metal told me how narrow had been my escape.",
        ],
    },
    "elise": {
        "title": "The friend whose warning he had rejected",
        "cite": "Reader, page 114",
        "text": [
            "I was recalled to myself by a frantic plucking at my wrist.",
            "A woman bent over me and tugged at me with her left hand, while she held a candle in her right.",
            "It was the same friend whose warning I had so foolishly rejected.",
            "“Come!” she cried breathlessly. “They will be here in a moment. They will see that you are not there. Do not waste precious time, but come!”",
            "This time, I did not scorn her advice.",
        ],
    },
    "window": {
        "title": "Thirty feet down, and a reason to wait",
        "cite": "Reader, page 115",
        "text": [
            "Then she threw open a door to a bedroom, through the window of which the moon was shining brightly.",
            "“It is your only chance,” said she. “It is high, but it may be that you can jump it.”",
            "As she spoke, a light sprang into view at the further end of the passage, and I saw the lean figure of Colonel Lysander Stark rushing forward with a lantern in one hand and a butcher’s cleaver in the other.",
            "How quiet and sweet and wholesome the garden looked in the moonlight, and it could not be more than thirty feet down.",
            "I clambered out upon the sill, but I hesitated to jump, so I could hear what passed between my savior and the ruffian who pursued me.",
            "If she were ill-used, then at any risk I was determined to go back to her assistance.",
        ],
    },
    "fritz": {
        "title": "“Remember your promise after the last time”",
        "cite": "Reader, pages 115–117",
        "text": [
            "She threw her arms round him and tried to hold him back.",
            "“Fritz! Fritz!” she cried in English, “remember your promise after the last time. You said it would not happen again. He will be silent!”",
            "“You are mad, Elise!” he shouted, struggling to break away from her. “You will be the ruin of us. He has seen too much.”",
            "He dashed her to one side, and, rushing to the window, cut at me with his heavy weapon.",
            "I was hanging with my hands across the sill when his blow fell.",
            "I glanced at my hand, which was throbbing painfully, and, for the first time, saw that my thumb had been cut off.",
        ],
    },

    # ---------------------------------------------- chapter 4: 118 to 120
    "hedge": {
        "title": "Where he wakes up",
        "cite": "Reader, pages 117–118",
        "text": [
            "It must have been a long time, for a bright morning was breaking when I came to myself.",
            "My clothes were all wet with dew, and my coat-sleeve was drenched with blood.",
            "But, to my astonishment, neither house nor garden were to be seen.",
            "I had been lying in an angle of the hedge close by the road, and just a little lower down was the very train station at which I had arrived the previous night.",
        ],
    },
    "porter": {
        "title": "Nobody there has heard of the Colonel",
        "cite": "Reader, page 118",
        "text": [
            "Half dazed, I went into the station and asked about the morning train.",
            "There would be one to Reading in less than an hour.",
            "I asked the porter whether he had ever heard of Colonel Lysander Stark.",
            "The name was strange to him.",
            "Was there a police station nearby?",
            "There was one about three miles off.",
            "It was too far for me to go, weak as I was.",
        ],
    },
    "advert": {
        "title": "The engineer who went out at ten o’clock and never came back",
        "cite": "Reader, pages 118–119",
        "text": [
            "Then Sherlock Holmes pulled from the shelf one of the books in which he placed his newspaper cuttings.",
            "“Here is an advertisement that will interest you,” said he. “It appeared in all the papers about a year ago.”",
            "“Lost on the 9th inst., Mr. Jeremiah Hayling, aged 26, a hydraulic engineer. Left his lodgings at ten o’clock at night, and has not been heard of since.”",
            "“Ha! That represents the last time the Colonel needed his machine overhauled, I fancy.”",
            "“Good heavens!” cried my patient. “Then that explains what the girl said.”",
            "“Undoubtedly. It is clear that the Colonel was a cool and desperate man, who was absolutely determined that nothing should stand in the way of his little game.”",
        ],
    },
    "circle": {
        "title": "Bradstreet draws a circle round Eyford",
        "cite": "Reader, page 119",
        "text": [
            "There were Sherlock Holmes, the hydraulic engineer, Inspector Bradstreet of Scotland Yard, a plain-clothes officer, and myself.",
            "Bradstreet had spread a map of the country out upon the seat and was busy with his compass drawing a circle with Eyford for its center.",
            "“There you are,” said he. “That circle is drawn at a radius of ten miles from the village. The place we want must be somewhere near that line.”",
            "“You said ten miles, I think, sir?”",
        ],
    },
    "guesses": {
        "title": "Four guesses, and Holmes says all four are wrong",
        "cite": "Reader, page 120",
        "text": [
            "“I think I could lay my finger on it,” said Holmes quietly.",
            "“I say it is south, for the country is more deserted there.”",
            "“And I say east,” said my patient.",
            "“I am for the west,” remarked the plain-clothes man. “There are quiet little villages up there.”",
            "“And I am for the north,” said I; “because there are no hills there, and our friend says that he did not notice the carriage go up any.”",
            "“You are all wrong.”",
            "“But we can’t all be.”",
            "“Oh, yes, you can.”",
        ],
    },
}
