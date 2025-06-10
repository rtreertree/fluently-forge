"use server";

import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export const main = () => {
    var topic = "Talk about your day today";
    var audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync("Sample_1.wav"));
    var speechConfig = sdk.SpeechConfig.fromSubscription("YourSubscriptionKey", "YourServiceRegion");

    // setting the recognition language to English.
    speechConfig.speechRecognitionLanguage = "en-US";

    const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
        "",
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        false
    );
    pronunciationAssessmentConfig.enableProsodyAssessment = true;
    pronunciationAssessmentConfig.enableContentAssessmentWithTopic(topic);

    // create the speech recognizer.
    var reco = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationAssessmentConfig.applyTo(reco);

    var results = []; //eslint-disable-line
    var recognizedText = "";

    reco.recognized = function (s, e) {
        var jo = JSON.parse(e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult));
        if (jo.DisplayText != ".") {
            console.log(`Recognizing: ${jo.DisplayText}`);
            recognizedText += jo.DisplayText + " ";
        }
        results.push(jo);
    }

    function onRecognizedResult() {
        console.log(`Recognized text: ${recognizedText}`);
        var contentResult = results[results.length-1].NBest[0].ContentAssessment;

        console.log("Content assessment result: \n",
            "\tvocabulary score: ", Number(contentResult.VocabularyScore.toFixed(1)), '\n',
            "\tgrammar score: ", Number(contentResult.GrammarScore.toFixed(1)), '\n',
            "\ttopic score: ", Number(contentResult.TopicScore.toFixed(1))
        );
    }

    reco.canceled = function (s, e) {
        if (e.reason === sdk.CancellationReason.Error) {
            var str = "(cancel) Reason: " + sdk.CancellationReason[e.reason] + ": " + e.errorDetails;
            console.log(str);
        }
        reco.stopContinuousRecognitionAsync();
    };

    reco.sessionStopped = function (s, e) {
        reco.stopContinuousRecognitionAsync();
        reco.close();
        onRecognizedResult();
    };

    reco.startContinuousRecognitionAsync();
}