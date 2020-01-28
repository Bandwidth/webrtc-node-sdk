# Application Server SDK Documentation 

- Authorization: accountId and password/OAuth token pair.

##  API Methods

### startConference

* Return:
  * conferenceId: The id of the conference that was started.
* Description: Start a conference.
```javascript
let conferenceId = await bandwidthRtc.startConference();
```


### endConference

* Params :
  * conferenceId: The id of the conference you are ending.
* Description: End a conference.

```javascript
await bandwidthRtc.endConference(req.params.conferenceId);
```


### createParticipant

* Params:
  * conferenceId: The id of the conference that the participant will be in. 
* Return:
  * participantId: The id of the participant that was created.
* Description: Create a participant.

```javascript
let participantId = await bandwidthRtc.createParticipant(
  req.params.conferenceId
);
```


### removeParticipant

* Params:
  * conferenceId: The id of the conference the participant belongs to.
  * participantId: The id of the participant to removed.
* Description: Remove a participant.

```javascript
await bandwidthRtc.removeParticipant(conferenceId, participantId);
```

### subscribe

* Params:
  * conferenceId: The id of the conference.
  * participantId: The id of the participant to subscribe.
  * streamId: The stream that is being subscribed to.
* Description: Subscribe a participant to a stream.

```javascript
await bandwidthRtc.subscribe(
                conferenceId,
                participantId,
                streamId
              );
```

### unsubscribe

* Params:
  * conferenceId: The id of the conference.
  * participantId: The id of the participant to unsubscribe.
  * streamId: The stream that is being unsubscribed from.
* Description: Unsubscribe a participant from a stream.

```javascript
await bandwidthRtc.unsubscribe(
                conferenceId,
                participantId,
                streamId
              );
```

### unpublish

* Params:
  * conferenceId: The id of the conference.
  * participantId: The id of the participant that should unpublish.
  * streamId: The id of the stream that is being unpublished.
* Description: Unpublish a stream.

```javascript
await bandwidthRtc.unpublish(
                conferenceId,
                participantId,
                streamId
              );
```

## Events

### onParticipantJoined

* Description: Listens for onParticipantJoined event. 

```javascript
bandwidthRtc.onParticipantJoined(async event => {
  console.log(
    `participant ${event.participantId} joined conference ${event.conferenceId}`
  );)
});
```

### onParticipantLeft

* Description: Listens for onParticipantLeft event. 

```javascript
bandwidthRtc.onParticipantLeft(async event => {
  console.log(
    `participant ${event.participantId} left conference ${event.conferenceId}`
  );)
}
```

### onParticipantPublished

* Description: Listens for the onParticipantPublished event.

```javascript
bandwidthRtc.onParticipantPublished(async event => {
  console.log(
    `participant ${event.participantId} published stream ${event.streamId} to conference ${event.conferenceId}`
  );)
}
```

### onParticipantUnpublished

* Description: Listens for the onParticipantUnpublished event.

```javascript
bandwidthRtc.onParticipantUnpublished(async event => {
  console.log(
    `participant ${event.participantId} unpublished stream ${event.streamId} from conference ${event.conferenceId}`
  );)
}
```

### onParticipantUnsubscribed

* Description: Listens for the onParticipantUnsubscribed event.

```javascript
bandwidth.onParticipantUnsubscribed(async event => {
  console.log(
    `participant ${event.participantId} unsubscribed from stream ${event.streamId} in conference ${event.conferenceId}`
  );)
})
```