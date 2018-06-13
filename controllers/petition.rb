ALLOWED_PETITION_STATUSES = ['accepted', 'rejected', 'open', 'resolved', 'restricted']

class CivicallyPetition::PetitionController < ::ApplicationController
  def set_status
    params.require(:topic_id)
    params.require(:status)
    topic = Topic.find(params[:topic_id])

    if topic && topic.custom_fields['petition_status'] == params[:status]
      return render json: { reject: true, reason: "Petition status has not been changed" }
    end

    if !ALLOWED_PETITION_STATUSES.include? params[:status]
      return render json: { error: "Status is not allowed" }, status: 400
    end

    result = CivicallyPetition::Petition.update_status(topic, params[:status])

    if result
      render json: success_json
    else
      render json: error_json
    end
  end

  def resolve
    params.require(:topic_id)
    params.permit(:forced)

    topic = Topic.find(params[:topic_id])
    result = {}

    if response = CivicallyPetition::Petition.resolve(topic, params[:forced])

      ## Petition resolution may convert the petition topic into another subtype
      if topic.is_petition
        CivicallyPetition::Petition.update_status(topic, 'resolved')
      end

      result.merge!(message: response[:message]) if response.respond_to?(:message)

      if response[:route_to]
        MessageBus.publish("/petition/#{topic.id}", route_to: response[:route_to])
      end

      if response[:reload]
        MessageBus.publish("/petition/#{topic.id}", reload: true)
      end
    end

    render json: success_json.merge(result)
  end
end
