import axios from "axios";
import { Client as JsonRpcClient } from "rpc-websockets";
import {
  StartConferenceResponse,
  CreateParticipantRequest,
  CreateParticipantResponse,
  ParticipantJoinedEvent,
  ParticipantPublishedEvent,
  ParticipantUnpublishedEvent,
  ParticipantUnsubscribedEvent,
  ParticipantLeftEvent,
  SubscribeSucceededEvent,
  SubscribeFailedEvent,
  RtcAuthParams,
  RtcOptions,
  WebsocketDisconnectedError,
  UnauthorizedError
} from "./types";
const sdk = require("../package.json");

class BandwidthRtc {
  BandwidthRtc() {}

  private sdkVersion = sdk.version;

  private sipDestination = "+19192892727";

  private ws: JsonRpcClient | null = null;
  private pingInterval?: NodeJS.Timeout;
  private authToken: string | null = null;
  private tokenExpiration: number | null = null;
  private reconnectMillis: number = 0;
  private lastConnectionFailed: boolean = false;

  private participantJoinedHandler?: { (event: ParticipantJoinedEvent): void; };
  private participantPublishedHandler?: { (event: ParticipantPublishedEvent): void; };
  private participantUnpublishedHandler?: { (event: ParticipantUnpublishedEvent): void; };
  private participantLeftHandler?: { (event: ParticipantLeftEvent): void };
  private participantUnsubscribedHandler?: { (event: ParticipantUnsubscribedEvent): void; };
  private subscribeSucceededHandler?: { (event: SubscribeSucceededEvent): void; };
  private subscribeFailedHandler?: { (event: SubscribeFailedEvent): void };

  connect(authParams: RtcAuthParams, options?: RtcOptions): Promise<void> {
    // default options
    let rtcOptions = {
      websocketUrl: "wss://server.webrtc.bandwidth.com",
      sipDestination: this.sipDestination
    };

    // override defaults with options passed in
    if (options) {
      rtcOptions = { ...rtcOptions, ...options };
    }

    // update the sipDestination field with any override value
    this.sipDestination = rtcOptions.sipDestination;

    return this._connect(authParams, rtcOptions);
  }

  private _connect(authParams: RtcAuthParams, rtcOptions: RtcOptions): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const sleep = (millis: number) => {
        return new Promise(resolve => {
          setTimeout(() => resolve(), millis);
        });
      };

      const waitAndReconnect = async () => {
        const sleepTime = this.reconnectMillis;
        console.log(
          sleepTime > 0
            ? `Waiting ${sleepTime / 1000}s and reconnecting`
            : "Reconnecting"
        );
        await sleep(sleepTime);
        this.reconnectMillis = Math.min(
          sleepTime === 0 ? 1000 : 2 * sleepTime,
          16000
        );

        try {
          return await this._connect(authParams, rtcOptions);
        } catch (error) {
          return reject(error);
        }
      };

      // Try to reuse auth token if we have one and it hasn't expired yet
      if (
        !(
          this.authToken &&
          this.tokenExpiration &&
          Date.now() < this.tokenExpiration
        )
      ) {
        try {
          this.authToken = await this.getClientCredentials(authParams);
        } catch (error) {
          // Credentials are invalid, fail fast
          console.log(`Error getting credentials, message: ${error.message}`);
          let errorMessage = "Error getting credentials";
          if (error.response && error.response.status === 401) {
            errorMessage = "Unauthorized: invalid credentials";
          }
          return reject(new UnauthorizedError(errorMessage));
        }
      }

      let websocketUrlWithQuery = `${rtcOptions.websocketUrl}/v1/?at=c&auth=${this.authToken}&accountId=${authParams.accountId}`;
      if (rtcOptions.eventFilter) {
        websocketUrlWithQuery += `&eventFilter=${rtcOptions.eventFilter}`;
      }
      websocketUrlWithQuery += `&sdkVersion=${this.sdkVersion}`;
      const ws = new JsonRpcClient(websocketUrlWithQuery, {
        autoconnect: false,
        reconnect: false
      });
      this.ws = ws;

      ws.addListener("participantJoined", (event: ParticipantJoinedEvent) => {
        if (this.participantJoinedHandler) {
          this.participantJoinedHandler(event);
        }
      });

      ws.addListener("participantLeft", (event: ParticipantLeftEvent) => {
        if (this.participantLeftHandler) {
          this.participantLeftHandler(event);
        }
      });

      ws.addListener("participantPublished", (event: ParticipantPublishedEvent) => {
        if (this.participantPublishedHandler) {
          this.participantPublishedHandler(event);
        }
      });

      ws.addListener("participantUnpublished", (event: ParticipantUnpublishedEvent) => {
        if (this.participantUnpublishedHandler) {
          this.participantUnpublishedHandler(event);
        }
      });

      ws.addListener("participantUnsubscribed", (event: ParticipantUnsubscribedEvent) => {
        if (this.participantUnsubscribedHandler) {
          this.participantUnsubscribedHandler(event);
        }
      });

      ws.addListener("subscribeSucceeded", (event: SubscribeSucceededEvent) => {
        if (this.subscribeSucceededHandler) {
          this.subscribeSucceededHandler(event);
        }
      });

      ws.addListener("subscribeFailed", (event: SubscribeFailedEvent) => {
        if (this.subscribeFailedHandler) {
          this.subscribeFailedHandler(event);
        }
      });

      ws.on("open", () => {
        this.lastConnectionFailed = false;
        this.reconnectMillis = 0;
        this.pingInterval = setInterval(() => {
          ws.call("onTest", {});
        }, 300000);
        resolve();
      });

      ws.on("error", (error: Error) => {
        console.log(`Websocket error, message: ${error.message}`);
        this.ws = null;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }

        if (error.message.includes("401")) {
          // One expired token is unlikely, but possible (expires during the call). Two in a row defies probability.
          if (this.lastConnectionFailed) {
            return reject(new UnauthorizedError());
          } else {
            console.log("Unauthorized, retrying once with new token");
            this.authToken = null;
            this.reconnectMillis = 0;
            this.lastConnectionFailed = true;
          }
        }
        waitAndReconnect();
      });

      ws.on("close", (code: number) => {
        this.ws = null;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
        }
        if (code !== 1000) {
          console.log(`Websocket closed, code: ${code}`);
          waitAndReconnect();
        }
      });

      ws.connect();
    });
  }

  private async getClientCredentials(
    authParams: RtcAuthParams
  ): Promise<string> {
    const encodedBasicCredential = Buffer.from(
      authParams.username + ":" + authParams.password
    ).toString("base64");
    let response = await axios({
      url: "https://id.bandwidth.com/api/v1/oauth2/token",
      method: "POST",
      headers: {
        Authorization: "Basic " + encodedBasicCredential,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": `Bandwidth WebRTC Node SDK/${this.sdkVersion}`
      },
      data: "grant_type=client_credentials&scope="
    });
    this.tokenExpiration = Date.now() + response.data.expires_in * 1000;
    return response.data.access_token;
  }

  async startConference(): Promise<string> {
    if (this.ws) {
      let response = (await this.ws.call("startConference", {})) as StartConferenceResponse;
      return response.conferenceId;
    } else {
      throw new WebsocketDisconnectedError();
    }
  }

  async endConference(conferenceId: string): Promise<void> {
    if (this.ws) {
      await this.ws.call("endConference", {
        conferenceId: conferenceId
      });
    } else {
      throw new WebsocketDisconnectedError();
    }
  }

  async createParticipant(conferenceId: string, roles?: Set<string>): Promise<[string, string]> {
    if (this.ws) {
      let params: CreateParticipantRequest = {
        conferenceId: conferenceId
      };
      if (roles) {
        params.roles = roles;
      }
      let response = (await this.ws.call("createParticipant",
        params
      )) as CreateParticipantResponse;
      return [response.participantId, response.deviceToken];
    } else {
      throw new WebsocketDisconnectedError();
    }
  }

  async removeParticipant(conferenceId: string, participantId: string): Promise<void> {
    if (this.ws) {
      await this.ws.call("removeParticipant", {
        conferenceId: conferenceId,
        participantId: participantId
      });
    } else {
      throw new WebsocketDisconnectedError();
    }
  }

  async subscribe(conferenceId: string, participantId: string, streamId: string): Promise<void> {
    if (this.ws) {
      await this.ws.call("subscribeParticipant", {
        conferenceId: conferenceId,
        participantId: participantId,
        streamId: streamId
      });
    } else {
      throw new WebsocketDisconnectedError();
    }
  }

  async unsubscribe(conferenceId: string, participantId: string, streamId: string): Promise<void> {
    if (this.ws) {
      await this.ws.call("unsubscribeParticipant", {
        conferenceId: conferenceId,
        participantId: participantId,
        streamId: streamId
      });
    } else {
      throw new WebsocketDisconnectedError();
    }
  }

  async unpublish(conferenceId: string, participantId: string, streamId: string): Promise<void> {
    if (this.ws) {
      await this.ws.call("unpublish", {
        conferenceId: conferenceId,
        participantId: participantId,
        streamId: streamId
      });
    } else {
      throw new WebsocketDisconnectedError();
    }
  }

  onParticipantJoined(callback: {
    (event: ParticipantJoinedEvent): void;
  }): void {
    this.participantJoinedHandler = callback;
  }

  onParticipantLeft(callback: {
    (event: ParticipantLeftEvent): void;
  }): void {
    this.participantLeftHandler = callback;
  }

  onParticipantPublished(callback: {
    (event: ParticipantPublishedEvent): void;
  }): void {
    this.participantPublishedHandler = callback;
  }

  onParticipantUnpublished(callback: {
    (event: ParticipantUnpublishedEvent): void;
  }): void {
    this.participantUnpublishedHandler = callback;
  }

  onSubscribeSucceeded(callback: {
    (event: SubscribeSucceededEvent): void;
  }): void {
    this.subscribeSucceededHandler = callback;
  }

  onSubscribeFailed(callback: {
    (event: SubscribeFailedEvent): void;
  }): void {
    this.subscribeFailedHandler = callback;
  }

  onParticipantUnsubscribed(callback: {
    (event: ParticipantUnsubscribedEvent): void;
  }): void {
    this.participantUnsubscribedHandler = callback;
  }

  disconnect(): void {
    if (this.ws) {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }
      this.ws.close();
      this.ws = null;
    } else {
      throw new WebsocketDisconnectedError();
    }
  }

  generateTransferBxml(conferenceId: string, participantId: string) {
    return `<Transfer transferCallerId="+1${conferenceId}${participantId}"><PhoneNumber>${this.sipDestination}</PhoneNumber></Transfer>`;
  }
}

export default BandwidthRtc;
