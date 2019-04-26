declare module 'cloudinary' {
  export function config(config: {
    cloud_name: string;
    api_key: string;
    api_secret: string
  }): void

  export var v2: {
    uploader: {
      upload_stream: (
        callback?: (error: Error, result: any) => any
      ) => NodeJS.WriteStream
      upload: (
        path: string,
        callback?: (error: Error, result: any) => any
      ) => any
    }
  }
}
