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
      false
    end
  end
end
