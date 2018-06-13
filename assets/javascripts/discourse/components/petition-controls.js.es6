import { default as computed, observes, on } from 'ember-addons/ember-computed-decorators';
import { setPetitionStatus, resolvePetition } from '../lib/petition-utilities';
import { cookAsync } from 'discourse/lib/text';
import { getOwner } from 'discourse-common/lib/get-owner';

export default Ember.Component.extend({
  classNames: ['petition-controls'],
  showResolutionAction: Ember.computed.or('resolutionIsValid', 'forceResolution'),
  showResolution: false,
  showPoints: false,

  @computed('topic.vote_count', 'topic.petition_vote_threshold')
  reachedThreshold: (count, threshold) => count >= threshold,

  @computed('topic.petition_status')
  hasDecision: (status) => status === 'accepted' || status === 'rejected',

  resolved: Ember.computed.equal('topic.petition_status', 'resolved'),

  @computed('hasDecision', 'reachedThreshold')
  resolutionIsValid: (hasDecision, reachedThreshold) => hasDecision && reachedThreshold,

  @computed('hasDecision', 'resolutionIsValid')
  showInvalidResolution: (hasDecision, resolutionIsValid) => hasDecision && !resolutionIsValid,

  @computed('topic.closed')
  canUpdateStatus(closed){
    return !closed && this.get('currentUser.admin');
  },

  @computed('topic.petition_status')
  showAccepted: (status) => status !== 'accepted',

  @computed('topic.petition_status')
  showRejected:(status) => status !== 'rejected',

  @computed('topic.petition_status')
  showOpen: (status) => status !== 'open',

  @computed('topic.vote_count', 'topic.petition_vote_threshold')
  remainingVotes(count, total) {
    return total - count;
  },

  @computed('topic.petition_messages')
  showInfo(customMessages) {
    return customMessages && customMessages['info'];
  },

  buildMessage(type = null, subtype = null, params = {}) {
    let key = `petition.message.${type}`;

    if (subtype) key += '.' + subtype;

    let message = I18n.t(key, params);

    const customMessages = this.get('topic.petition_messages');

    if (customMessages && customMessages[type]) {
      if (subtype) {
        if (customMessages[type][subtype]) {
          message = customMessages[type][subtype];
        }
      } else {
        message = customMessages[type];
      }
    }

    return message;
  },

  @on('didInsertElement')
  @observes('topic.user_voted', 'topic.closed', 'remainingVotes', 'hasDecision')
  setMessage() {
    const closed = this.get('topic.closed');
    const user = this.get('currentUser');
    const hasDecision = this.get('hasDecision');
    const resolved = this.get('resolved');
    let message;

    if (closed) {
      message = this.buildMessage('closed');
    } else if (resolved) {
      message = this.buildMessage('resolved');
    } else if (hasDecision) {
      const status = this.get('topic.petition_status');
      message = this.buildMessage('decision', null, { status });
    } else if (user) {
      const topic = this.get('topic');
      const voted = this.get('topic.user_voted');

      let userType = user.id === topic.user_id ? 'petitioner' : 'user';

      if (voted) {
        message = this.buildMessage(userType, 'vote');

        const remaining = this.get('remainingVotes');
        let remainingMsg;

        if (remaining > 1) {
          remainingMsg = this.buildMessage('remaining', 'multiple', { remaining });
        } else if (remaining === 1) {
          remainingMsg = this.buildMessage('remaining', 'single', { remaining });
        }

        if (remainingMsg) {
          message += ` ${remainingMsg}`;
        }
      } else {
        message = this.buildMessage(userType, 'no_vote');
      }

    } else {
      message = this.buildMessage('guest');
    }

    cookAsync(message).then((cooked) => this.set('cookedMessage', cooked));
  },

  remainingMsg() {
    let remainingMsg;


    return remainingMsg;
  },

  @computed('topic.user_voted')
  actionClasses(userVoted) {
    let classes = "btn";
    if (userVoted) classes += " btn-primary";
    return classes;
  },

  showMessage: Ember.computed.notEmpty('cookedMessage'),
  showAction: Ember.computed.bool('topic.details.can_invite_via_email'),
  actionLabel: 'petition.invite',
  actionIcon: 'group',

  actions: {
    updatePetitionStatus(status) {
      const topic = this.get('topic');
      const currentStatus = topic.get('petition_status');

      topic.set('petition_status', status);
      setPetitionStatus({ topic_id: topic.get('id'), status }).then((result) => {
        if (result.error) {
          topic.set('petition_status', currentStatus);
        }
      });
    },

    resolve() {
      const topicId = this.get('topic.id');
      const forced = this.get('forceResolution');

      this.set('loading', true);
      resolvePetition(topicId, forced).then((result) => {

        if (this._state !== 'destroying') {
          this.set('loading', false);
        }

        if (result.message) {
          return bootbox.alert(result.message);
        };
      });
    },

    action() {
      const topicRoute = getOwner(this).lookup('route:topic');
      topicRoute.send('showInvite');
    }
  }
});
