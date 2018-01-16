import { ajax } from 'discourse/lib/ajax';

var petitionStatus = function(status) {
  if (!status) return '';
  let statusText = status.charAt(0).toUpperCase() + status.substr(1).toLowerCase();
  return `<div class='petition-status ${status}'>${statusText}</div>`;
};

var setPetitionStatus = function(data) {
  return ajax('/petition/set_status', { type: 'POST', data });
};

var resolvePetition = function(topicId, forced) {
  return ajax('/petition/resolve', { type: 'PUT', data: { topic_id: topicId, forced: forced }});
};

export { petitionStatus, setPetitionStatus, resolvePetition };
