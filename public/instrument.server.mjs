import * as Sentry from "@sentry/solidstart";

Sentry.init({
  dsn: "https://a7c36d42c2a023ed29dd5db76c079566@o4506630160187392.ingest.us.sentry.io/4511784457666560",

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/solidstart/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  }
});
