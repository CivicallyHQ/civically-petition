# name: civically-petition
# about: Allows topics to be used as petitions. Normally used in conjunction with discourse-voting.
# version: 0.1
# authors: Angus McLeod
# url: https://github.com/civicallyhq/civically-petition

register_asset 'stylesheets/civically-petition.scss'

Discourse.top_menu_items.push(:petitions)
Discourse.anonymous_top_menu_items.push(:petitions)
Discourse.filters.push(:petitions)
Discourse.anonymous_filters.push(:petitions)

after_initialize do
  require_dependency "application_controller"
  module ::CivicallyPetition
    class Engine < ::Rails::Engine
      engine_name "civically_petition"
      isolate_namespace CivicallyPetition
    end
  end

  CivicallyPetition::Engine.routes.draw do
    post "set_status" => "petition#set_status"
    put "resolve" => "petition#resolve"
  end

  Discourse::Application.routes.append do
    mount ::CivicallyPetition::Engine, at: "petition"
  end

  Category.register_custom_field_type('petition_enabled', :boolean)
  Category.register_custom_field_type('petition_vote_threshold', :integer)
  add_to_serializer(:basic_category, :petition_enabled) { object.custom_fields['petition_enabled'] }
  add_to_serializer(:basic_category, :petition_vote_threshold) { object.petition_vote_threshold }

  Topic.register_custom_field_type('petition_vote_threshold', :integer)
  Topic.register_custom_field_type('petition_messages', :json)
  add_to_serializer(:topic_view, :petition_id) { object.topic.petition_id }
  add_to_serializer(:topic_view, :include_petition_id) { object.topic.is_petition }
  add_to_serializer(:topic_view, :petition_status) { object.topic.petition_status }
  add_to_serializer(:topic_view, :include_petition_status?) { object.topic.is_petition }
  add_to_serializer(:topic_view, :petition_vote_threshold) { object.topic.petition_vote_threshold }
  add_to_serializer(:topic_view, :include_petition_vote_threshold?) { object.topic.is_petition }
  add_to_serializer(:topic_view, :petition_messages) { object.topic.petition_messages }
  add_to_serializer(:topic_view, :include_petition_messages?) { object.topic.is_petition }

  add_to_serializer(:topic_list_item, :petition_status) { object.petition_status }
  add_to_serializer(:topic_list_item, :include_petition_status?) { object.is_petition }
  TopicList.preloaded_custom_fields << "petition_status" if TopicList.respond_to? :preloaded_custom_fields

  load File.expand_path('../jobs/petition_status_changed.rb', __FILE__)
  load File.expand_path('../lib/petition.rb', __FILE__)
  load File.expand_path('../controllers/petition.rb', __FILE__)
  load File.expand_path('../serializers/petition_list.rb', __FILE__)

  DiscourseEvent.on(:search_extension_ready) do
    class SearchExtension::SimilarSerializer
      attributes :petition_status

      def petition_status
        object.custom_fields['petition_status']
      end
    end
  end

  require_dependency 'topic'
  class ::Topic
    def is_petition
      self.subtype === 'petition'
    end

    def petition_id
      self.custom_fields['petition_id']
    end

    def petition_status
      self.custom_fields['petition_status']
    end

    def petition_vote_threshold
      if self.custom_fields['petition_vote_threshold']
        self.custom_fields['petition_vote_threshold'].to_i
      else
        self.category && self.category.petition_vote_threshold
      end
    end

    def petition_messages
      if self.custom_fields['petition_messages']
        self.custom_fields['petition_messages']
      else
        nil
      end
    end

    def petition_supporters
      User.where("id in (
        SELECT user_id FROM user_custom_fields WHERE name = 'votes' AND value = ?
      )", self.id.to_s).to_a
    end
  end

  class ::Category
    def petition_vote_threshold
      if self.custom_fields['petition_vote_threshold']
        self.custom_fields['petition_vote_threshold'].to_i
      else
        nil
      end
    end
  end

  require_dependency 'topic_query'
  class ::TopicQuery
    def list_petitions
      create_list(:petitions, ascending: 'true') do |topics|
        topics.where(subtype: 'petition')
      end
    end
  end

  DiscourseEvent.trigger(:petition_ready)
end
