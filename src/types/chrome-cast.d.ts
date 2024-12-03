interface ChromeCastRequest {
  appId: string;
}

interface ChromeCastConfig {
  sessionRequest: ChromeCastRequest;
  sessionListener: (session: ChromeCastSession) => void;
  receiverListener: (availability: string) => void;
  autoJoinPolicy?: string;
}

interface ChromeCastSession {
  stop: () => Promise<void>;
  loadMedia: (request: ChromeCastLoadRequest) => Promise<void>;
  mediaSession?: {
    seek: (options: { currentTime: number }) => void;
  };
}

interface ChromeCastMediaInfo {
  contentId: string;
  contentType: string;
}

interface ChromeCastLoadRequest {
  media: ChromeCastMediaInfo;
}

interface Window {
  chrome: {
    cast: {
      isAvailable: boolean;
      SessionRequest: new (appId: string) => ChromeCastRequest;
      ApiConfig: new (
        sessionRequest: ChromeCastRequest,
        sessionListener: (session: ChromeCastSession) => void,
        receiverListener: (availability: string) => void,
        autoJoinPolicy?: string
      ) => ChromeCastConfig;
      initialize: (
        apiConfig: ChromeCastConfig,
        onSuccess: () => void,
        onError: (error: Error) => void
      ) => void;
      requestSession: (
        successCallback: (session: ChromeCastSession) => void,
        errorCallback: (error: Error) => void
      ) => void;
      media: {
        DEFAULT_MEDIA_RECEIVER_APP_ID: string;
        MediaInfo: new (url: string, contentType: string) => ChromeCastMediaInfo;
        LoadRequest: new (mediaInfo: ChromeCastMediaInfo) => ChromeCastLoadRequest;
      };
    };
  };
  __onGCastApiAvailable?: (isAvailable: boolean) => void;
} 