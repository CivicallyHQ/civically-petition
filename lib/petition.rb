class CivicallyPetition::Petition
  def self.resolutions
    @resolutions ||= []
  end

  def self.add_resolution(id, &block)
    resolutions << { id: id, block: block }
  end

  def self.resolve(topic, forced)
    resolution = @resolutions.select { |r| r[:id] === topic.petition_id }.first
    if resolution && resolution[:block]
      resolution[:block].call(topic, forced)
    else
      true
    end
  end

  def self.update_status(topic, status)
    topic.custom_fields['petition_status'] = status

    if topic.save_custom_fields(true)
      Jobs.enqueue(:petition_status_changed,
        topic_id: topic.id,
        time: Time.now,
        status: topic.petition_status
      )

      MessageBus.publish("/petition/#{topic.id}", petition_status: status)

      true
    else
      false
    end
  end

  def self.create(user, params)
    topic_params = {
      skip_validations: true,
      subtype: 'petition'
    }

    if params[:title]
      topic_params[:title] = params[:title]
    else
      return { errors: I18n.t('petition.error.title') }
    end

    topic_params[:category] = params[:category] ? params[:category] : SiteSetting.petition_category_id.to_i

    topic_params[:featured_link] = params[:featured_link] if params[:featured_link]

    custom_fields = {}

    if params[:id]
      custom_fields[:petition_id] = params[:id]
    else
      return { errors: I18n.t('petition.error.id') }
    end

    custom_fields[:petition_status] = params[:status] ? params[:status] : 'open'

    custom_fields[:petition_messages] = params[:messages].to_json if params[:messages]

    custom_fields[:petition_vote_threshold] = params[:vote_threshold].to_i if params[:vote_threshold]

    topic_params[:topic_custom_fields] = custom_fields

    TopicCreator.create(user, Guardian.new(user), topic_params)
  end

  def self.find(petition_id)
    Topic.joins("LEFT JOIN topic_custom_fields ON topics.id = topic_custom_fields.topic_id")
      .where("topic_custom_fields.name = 'petition_id' AND topic_custom_fields.value = ?", petition_id.to_s)
  end
end
