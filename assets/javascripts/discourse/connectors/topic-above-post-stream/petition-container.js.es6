import { getOwner } from 'discourse-common/lib/get-owner';

export default {
  setupComponent(attrs, component) {
    const enabled = (topic) => {
      if (!topic) return false;
      if (topic.category &&
         (topic.id !== topic.category.topic_id) &&
         topic.category.petition_enabled) return true;
      return topic.petition;
    };

    component.set('petitionEnabled', enabled(attrs.model));

    const controller = getOwner(this).lookup('controller:topic');
    controller.addObserver('model.petition', () => {
      if (this._state === 'destroying') return;
      const topic = controller.get('model');
      const petitionEnabled = topic ? enabled(topic) : false;
      component.set('petitionEnabled', petitionEnabled);
    });
  }
};
