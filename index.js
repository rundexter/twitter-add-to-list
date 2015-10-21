var Twit   = require('twit')
  , assert = require('assert')
  , _      = require('lodash')
  , async  = require('async')
;

module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var consumerKey       = dexter.environment('twitter_consumer_key')
          , consumerSecret    = dexter.environment('twitter_consumer_secret')
          , accessToken       = dexter.environment('twitter_access_token')
          , accessTokenSecret = dexter.environment('twitter_access_token_secret')
          , username          = step.input('username').first()
          , list              = step.input('list').first()
          , self              = this
          , T
        ;

        assert(consumerKey,       'environment.twitter_consumer_key required');
        assert(consumerSecret,    'environment.twitter_consumer_secret required');
        assert(accessToken,       'environment.twitter_access_token required');
        assert(accessTokenSecret, 'environment.twitter_access_token_secret required');
        assert(username,          'username is required');
        assert(list,              'list is required');

        username = username.replace(/^@/, '');

        T = new Twit({
            consumer_key          : consumerKey
            , consumer_secret     : consumerSecret
            , access_token        : accessToken
            , access_token_secret : accessTokenSecret
        });

        async.waterfall([
            //get the list ID
            function(cb) {
                T.get('lists/list', function(err, data, response) {
                    if(err) return cb(err);
                    var id = _.get(_.find(data, {name: list}), 'id');
                    console.log(data.title);
                    return id
                        ? cb(null, id)
                        : cb('Could not find list ' + list)
                    ;
                });
            }
            //get the user id and pass the list id on
            , function(listId, cb) {
                T.get('/users/lookup', { screen_name: username }, function(err, data, response) {
                    if(err) return cb(err);
                    cb(null, listId, data[0].id, data[0].screen_name);
                });
            }
            //update the list
            , function(listId, userId, screenName, cb) {
                T.post('lists/members/create'
                   , {
                       list_id       : listId
                       , user_id     : userId
                       , screen_name : screenName
                   }
                   , function(err, data, response) {
                       if(err) return cb(err);
                       self.log('User added!');
                       cb(null, true);
                   });
            }
        ], function(err, result) {
            return err
                ? self.fail(err)
                : self.complete({});
        });
    }
};
