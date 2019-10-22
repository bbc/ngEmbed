# ngEmbed

An angular module based on the jquery library https://github.com/nfl/jquery-oembed-all

This is now compatible with Angular 1.6

## Getting started

* Clone the repo
* Run ```npm install```
* Run ```bower install```

## To test

Run the unit tests and/or open test.html in a browser

## To build

run ```grunt build```

## Using it

Include the module as a dependency for your app e.g.
```module('app', ['ngEmbed']);```

To embed content simply create the ngEmbed directive and set the `embed-url` attribute. The results of the embed will be placed in the `ngModel` which will contain the provider, the urls, and the embed code.

You can also provide a settings object that will allow you to pass either global settings or provider-specific settings just as in the jquery-embed-all library.
