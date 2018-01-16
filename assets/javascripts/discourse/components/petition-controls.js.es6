import { default as computed } from 'ember-addons/ember-computed-decorators';
import { setPetitionStatus, resolvePetition } from '../lib/petition-utilities';
import { getOwner } from 'discourse-common/lib/get-owner';

export default Ember.Component.extend({
  classNames: ['petition-controls'],
  showResolutionAction: Ember.computed.or('resolutionIsValid', 'forceResolution'),

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

  @computed('topic.user_voted', 'topic.closed')
  message(voted, closed) {
    if (closed) return I18n.t('petition.resolved');
    const topic = this.get('topic');
    const user = this.get('currentUser');
    let message = I18n.t('petition.message.guest');
    if (user) message = I18n.t('petition.message.user');
    if (voted) message = null;
    if (user && user.id === topic.user_id) message = I18n.t('petition.message.petitioner');
    return message;
  },

  showMessage: Ember.computed.notEmpty('message'),

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