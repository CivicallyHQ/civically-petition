import { registerUnbound } from 'discourse-common/lib/helpers';
import { petitionStatus } from '../lib/petition-utilities';

registerUnbound('petition-status', function(status) {
  return new Handlebars.SafeString(petitionStatus(status));
});
