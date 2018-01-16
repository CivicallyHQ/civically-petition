module Jobs
  class PetitionStatusChanged < Jobs::Base
    def execute(args)
      topic = Topic.find(args[:topic_id])
      status = I18n.t("petition.status.#{args[:status]}")
      time_format = '%A, %-d %B %Y at %H:%M %Z'
      time = args[:time].to_datetime.utc.strftime(time_format)

      topic.petition_supporters.each do |user|
        SystemMessage.create_from_system_user(user,
          :petition_status_changed,
            status: status,
            title: topic.title,
            url: topic.url,
            time: time
        )
      end
    end
  end
end
