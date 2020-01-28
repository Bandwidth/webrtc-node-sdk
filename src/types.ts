export interface StartConferenceResponse {
  conferenceId: string;
}

export interface CreateParticipantRequest {
  conferenceId: string;
  roles?: Set<string>;
}

export interface CreateParticipantResponse {
  conferenceId: string;
  participantId: string;
}

export interface ParticipantJoinedEvent {
  conferenceId: string;
  participantId: string;
}

export interface ParticipantLeftEvent {
  conferenceId: string;
  participantId: string;
}

export interface ParticipantPublishedEvent {
  conferenceId: string;
  participantId: string;
  streamId: string;
}

export interface ParticipantUnpublishedEvent {
  conferenceId: string;
  participantId: string;
  streamId: string;
}

export interface SubscribeSucceededEvent {
  conferenceId: string;
  participantId: string;
  streamId: string;
}

export interface SubscribeFailedEvent {
  conferenceId: string;
  participantId: string;
  streamId: string;
}

export interface ParticipantUnsubscribedEvent {
  conferenceId: string;
  participantId: string;
  streamId: string;
}

export interface RtcAuthParams {
  accountId: string;
  username: string;
  password: string;
}

export interface RtcOptions {
  websocketUrl?: string;
  sipDestination?: string;
}

export class WebsocketDisconnectedError extends Error {
  constructor() {
    super("Websocket is not connected");
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
  }
}
