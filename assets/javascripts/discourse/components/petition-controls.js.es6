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

  getMessage(userType, type = 'all') {
    const customMessages = this.get('topic.petition_messages');
    let message = I18n.t(`petition.message.${userType}.${type}`);

    if (customMessages && customMessages[userType] && customMessages[userType][type]) {
      message = customMessages[userType][type];
    }

    return message;
  },

  @on('didInsertElement')
  @observes('topic.user_voted', 'topic.closed', 'remainingVotes')
  setMessage() {
    const closed = this.get('topic.closed');
    const user = this.get('currentUser');
    let message;

    if (closed) {
      message = I18n.t('petition.closed');
    } else if (user) {
      const topic = this.get('topic');
      const voted = this.get('topic.user_voted');

      let userType = user.id === topic.user_id ? 'petitioner' : 'user';

      message = this.getMessage(userType, 'no_vote');

      if (voted) {
        message = this.getMessage(userType, 'vote');

        let remainingMsg = this.remainingMsg();
        if (remainingMsg) message += ` ${remainingMsg}`;
      }
    } else {
      message = this.getMessage('guest');
    }

    cookAsync(message).then((cooked) => this.set('cookedMessage', cooked));
  },

  remainingMsg() {
    const remaining = this.get('remainingVotes');
    let remainingMsg;

    if (remaining > 1) {
      remainingMsg = I18n.t('petition.message.remaining.multiple', { remaining })
    } else if (remaining === 1) {
      remainingMsg = I18n.t('petition.message.remaining.single', { remaining });
    }

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
