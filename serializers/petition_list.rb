class CivicallyPetition::PetitionListSerializer < ApplicationSerializer
  attributes :id, :title, :url, :petition_status, :vote_count
end
