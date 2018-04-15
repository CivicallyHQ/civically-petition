import { observes } from 'ember-addons/ember-computed-decorators';
import { cookAsync } from 'discourse/lib/text';

export default Ember.Component.extend({
  classNames: 'petition-info',
  showInfo: false,

  didInsertElement() {
    Ember.$(document).on('click', Ember.run.bind(this, this.documentClick));
  },

  willDestroyElement() {
    Ember.$(document).off('click', Ember.run.bind(this, this.documentClick));
  },

  documentClick(e) {
    let $element = this.$('.petition-popover');
    let $target = $(e.target);
    if ($target.closest($element).length < 1 &&
        this._state !== 'destroying') {
      this.set('showInfo', false);
    }
  },

  @observes("showInfo")
  setPointsInfo() {
    const showInfo = this.get('showInfo');
    if (showInfo) {
      const topic = this.get('topic');
      const info = I18n.t(`petition.${topic.petition_id}.info`, { placeName: topic.title });

      cookAsync(info).then(cooked => {
        this.set('info', cooked);
      });
    }
  },

  actions: {
    toggleInfo() {
      this.toggleProperty(`showInfo`);
    }
  }
})
