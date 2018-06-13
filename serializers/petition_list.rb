class CivicallyPetition::PetitionListSerializer < ApplicationSerializer
  attributes :id,
             :title,
             :url,
             :petition_id,
             :petition_status,
             :petition_vote_threshold,
             :vote_count,
             :location

  def include_location?
    object.respond_to?(:location)
  end
end
