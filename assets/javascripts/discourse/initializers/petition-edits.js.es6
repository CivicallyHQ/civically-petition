import TopicController from 'discourse/controllers/topic';
import Topic from 'discourse/models/topic';
import { withPluginApi } from 'discourse/lib/plugin-api';
import { observes } from 'ember-addons/ember-computed-decorators';
import { escapeExpression } from 'discourse/lib/utilities';
import { replaceIcon } from 'discourse-common/lib/icon-library';
import { h } from 'virtual-dom';

export default {
  name: 'petition-edits',
  initialize(){

    replaceIcon('notification.petition.notification.accepted', 'check');
    replaceIcon('notification.petition.notification.rejected', 'times');
    replaceIcon('notification.petition.notification.open', 'circle-o');

    withPluginApi('0.5', api => {
      api.reopenWidget('notification-item', {
        description() {
          const data = this.attrs.data;
          if (data.badge_name) return escapeExpression(data.badge_name);
          if (data.description) return escapeExpression(data.description);
          return Ember.isEmpty(data.topic_title) ? "" : escapeExpression(data.topic_title);
        }
      });

      api.reopenWidget('vote-count', {
        html(attrs){
          let voteCountContents = attrs.vote_count.toString();
          if (attrs.petition_vote_threshold) {
            voteCountContents += ` / ${attrs.petition_vote_threshold}`;
          }

          let whoVoted = null;
          if (this.siteSettings.voting_show_who_voted && this.state.whoVotedUsers && this.state.whoVotedUsers.length > 0) {
            whoVoted = this.attach('small-user-list', {
              users: this.state.whoVotedUsers,
              addSelf: attrs.liked,
              listClassName: 'regular-votes',
            });
          }

          let buffer = [h('div.vote-count', voteCountContents)];
          if (whoVoted) {
            buffer.push(h('div.who-voted.popup-menu.voting-popup-menu', [whoVoted]));
          }
          return buffer;
        },
      });
    });

    Topic.reopen({
      resolutionAction: null
    });

    TopicController.reopen({
      @observes('model')
      subscribeToPetitionUpdates() {
        const topicId = this.get('model.id');
        if (topicId) {
          this.messageBus.subscribe("/petition/" + topicId, (data) => {
            if (data.petition_status !== undefined) {
              this.set('model.petition_status', data.petition_status);
            }

            if (data.route_to) {
              document.location.href = Discourse.getURL(data.route_to);
            }
          });
        }
      }
    });
  }
};
